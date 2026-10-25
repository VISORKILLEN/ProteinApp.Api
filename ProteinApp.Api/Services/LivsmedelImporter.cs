using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ProteinApp.Api.Data;
using ProteinApp.Api.Models;

namespace ProteinApp.Api.Services;

/// <summary>Importerar Livsmedelsverkets livsmedel till databasen vid första starten.</summary>
public class LivsmedelImporter(
    IServiceScopeFactory scopes,
    IHttpClientFactory httpFactory,
    ILogger<LivsmedelImporter> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try { await ImportAsync(ct); }
        catch (OperationCanceledException) { }
        catch (Exception ex) { log.LogError(ex, "Importen misslyckades"); }
    }

    private async Task ImportAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();

        if (await db.Foods.AnyAsync(f => f.Source == "livsmedelsverket", ct))
        {
            log.LogInformation("Livsmedelsverkets data finns redan, hoppar över importen.");
            return;
        }

        var http = httpFactory.CreateClient("livsmedel");

        // Steg 1: hämta listan med alla livsmedel, 100 åt gången
        var items = new List<(int Number, string Name)>();
        var seen = new HashSet<int>();
        const int limit = 100;
        int? total = null;

        for (var offset = 0; ; offset += limit)
        {
            var json = await http.GetStringAsync(
                $"livsmedel?offset={offset}&limit={limit}&sprak=1", ct);
            using var doc = JsonDocument.Parse(json);

            var arr = FindArray(doc.RootElement, "livsmedel");
            if (arr is null)
            {
                log.LogWarning("Oväntat svar: {Json}", Truncate(json));
                break;
            }

            if (total is null && Prop(doc.RootElement, "_meta") is { } meta)
                total = ReadInt(Prop(meta, "totalRecords"));

            var added = 0;
            foreach (var el in arr.Value.EnumerateArray())
            {
                var nr = ReadInt(Prop(el, "nummer"));
                var name = Prop(el, "namn");
                if (nr is not null &&
                    name is { ValueKind: JsonValueKind.String } &&
                    seen.Add(nr.Value))
                {
                    items.Add((nr.Value, name.Value.GetString()!));
                    added++;
                }
            }

            if (items.Count == 0 && added == 0)
            {
                log.LogWarning("Kunde inte läsa livsmedel ur svaret: {Json}", Truncate(json));
                break;
            }

            // Klar när allt är hämtat, eller om inget nytt kom
            if (added == 0 || (total is not null && offset + limit >= total)) break;
        }

        log.LogInformation("Hittade {Count} livsmedel, hämtar näringsvärden...", items.Count);

        // Steg 2: hämta proteinvärdet för varje livsmedel, fyra anrop åt gången
        var results = new ConcurrentBag<Food>();
        var done = 0;

        await Parallel.ForEachAsync(
            items,
            new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = ct },
            async (item, token) =>
            {
                try
                {
                    var json = await http.GetStringAsync(
                        $"livsmedel/{item.Number}/naringsvarden?sprak=1", token);
                    using var doc = JsonDocument.Parse(json);
                    var protein = FindProtein(doc.RootElement);
                    if (protein is not null)
                    {
                        results.Add(new Food
                        {
                            Name = item.Name,
                            SearchName = item.Name.ToLowerInvariant(),
                            ProteinPer100g = Math.Round(protein.Value, 1),
                            Source = "livsmedelsverket",
                        });
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    log.LogWarning("Kunde inte hämta {Nr}: {Msg}", item.Number, ex.Message);
                }

                var n = Interlocked.Increment(ref done);
                if (n % 200 == 0) log.LogInformation("{N}/{Total}", n, items.Count);
            });

        db.Foods.AddRange(results);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Klart! Importerade {Count} livsmedel.", results.Count);
    }

    // --- Hjälpmetoder för JSON ---

    /// <summary>Hittar proteinvärdet (g per 100 g) i ett livsmedels näringsvärden.</summary>
    private static double? FindProtein(JsonElement root)
    {
        var arr = FindArray(root);
        if (arr is null) return null;

        foreach (var el in arr.Value.EnumerateArray())
        {
            var code = Prop(el, "euroFIRkod");
            var abbr = Prop(el, "forkortning");
            if (IsString(code, "PROT") || IsString(abbr, "Prot"))
                return ReadDouble(Prop(el, "varde"));
        }
        return null;
    }

    /// <summary>Hittar en lista i JSON-svaret, och hoppar över fält som börjar med "_" (t.ex. _links).</summary>
    private static JsonElement? FindArray(JsonElement root, string? preferredName = null)
    {
        if (root.ValueKind == JsonValueKind.Array) return root;
        if (root.ValueKind != JsonValueKind.Object) return null;

        if (preferredName is not null &&
            Prop(root, preferredName) is { ValueKind: JsonValueKind.Array } named)
            return named;

        foreach (var p in root.EnumerateObject())
            if (p.Value.ValueKind == JsonValueKind.Array && !p.Name.StartsWith('_'))
                return p.Value;

        return null;
    }

    /// <summary>Hämtar ett fält ur ett JSON-objekt, oavsett stora/små bokstäver.</summary>
    private static JsonElement? Prop(JsonElement? e, string name)
    {
        if (e is null || e.Value.ValueKind != JsonValueKind.Object) return null;
        foreach (var p in e.Value.EnumerateObject())
            if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                return p.Value;
        return null;
    }

    private static bool IsString(JsonElement? e, string expected) =>
        e is { ValueKind: JsonValueKind.String } &&
        string.Equals(e.Value.GetString(), expected, StringComparison.OrdinalIgnoreCase);

    /// <summary>Läser ett heltal, även om det skickas som text.</summary>
    private static int? ReadInt(JsonElement? e)
    {
        if (e is null) return null;
        if (e.Value.ValueKind == JsonValueKind.Number && e.Value.TryGetInt32(out var n)) return n;
        if (e.Value.ValueKind == JsonValueKind.String &&
            int.TryParse(e.Value.GetString(), NumberStyles.Integer,
                CultureInfo.InvariantCulture, out var s))
            return s;
        return null;
    }

    /// <summary>Läser ett decimaltal, även om det skickas som text eller med decimalkomma.</summary>
    private static double? ReadDouble(JsonElement? e)
    {
        if (e is null) return null;
        if (e.Value.ValueKind == JsonValueKind.Number) return e.Value.GetDouble();
        if (e.Value.ValueKind == JsonValueKind.String &&
            double.TryParse(e.Value.GetString()!.Replace(',', '.'),
                NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
            return d;
        return null;
    }

    private static string Truncate(string s) => s.Length <= 800 ? s : s[..800];
}