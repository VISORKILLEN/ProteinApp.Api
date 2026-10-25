using System.Globalization;
using System.Text.Json;
using ProteinApp.Api.Models;

namespace ProteinApp.Api.Services;

public enum LookupStatus { Found, NotFound, MissingProtein }

public record BarcodeLookup(LookupStatus Status, Food? Food = null, string? Name = null);

public class OpenFoodFactsClient(HttpClient http)
{
    public async Task<BarcodeLookup> LookupAsync(string code, CancellationToken ct = default)
    {
        using var resp = await http.GetAsync(
            $"api/v2/product/{code}.json?fields=product_name,brands,nutriments,serving_quantity",
            ct);

        if (!resp.IsSuccessStatusCode) return new(LookupStatus.NotFound);

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));

        if (!doc.RootElement.TryGetProperty("product", out var product) ||
            product.ValueKind != JsonValueKind.Object)
            return new(LookupStatus.NotFound);

        var name = ReadString(product, "product_name");
        var brand = ReadString(product, "brands");

        double? protein = null;
        if (product.TryGetProperty("nutriments", out var nutriments))
            protein = ReadNumber(nutriments, "proteins_100g");

        if (protein is null) return new(LookupStatus.MissingProtein, Name: name);

        var food = new Food
        {
            Name = string.IsNullOrWhiteSpace(name) ? "Okänd produkt" : name,
            SearchName = (name ?? "").ToLowerInvariant(),
            Brand = brand,
            Barcode = code,
            ProteinPer100g = Math.Round(protein.Value, 1),
            ServingGrams = ReadNumber(product, "serving_quantity"),
            Source = "openfoodfacts",
        };

        return new(LookupStatus.Found, food);
    }

    private static string? ReadString(JsonElement e, string prop) =>
        e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    // Open Food Facts skickar ibland tal som text, så vi hanterar båda
    private static double? ReadNumber(JsonElement e, string prop)
    {
        if (!e.TryGetProperty(prop, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number) return v.GetDouble();
        if (v.ValueKind == JsonValueKind.String &&
            double.TryParse(v.GetString(), NumberStyles.Float,
                CultureInfo.InvariantCulture, out var d))
            return d;
        return null;
    }
}