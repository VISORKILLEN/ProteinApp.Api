using Microsoft.EntityFrameworkCore;
using ProteinApp.Api.Data;
using ProteinApp.Api.Dtos;
using ProteinApp.Api.Services;

namespace ProteinApp.Api.Endpoints;

public static class FoodEndpoints
{
    public static IEndpointRouteBuilder MapFoodEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/foods");
        group.MapGet("/search", Search);
        group.MapGet("/barcode/{code}", GetByBarcode);
        return app;
    }

    // GET /api/foods/search?q=nötfärs
    private static async Task<IResult> Search(string q, AppDb db)
    {
        var term = q.Trim().ToLowerInvariant();
        var compact = term.Replace(" ", "");
        if (compact.Length < 2) return Results.Ok(Array.Empty<FoodDto>());

        var foods = await db.Foods
           .Where(f => f.SearchName.Replace(" ", "").Contains(compact))
           .OrderBy(f => f.SearchName.Replace(" ", "").StartsWith(compact) ? 0 : 1)
           .ThenBy(f => f.SearchName.Length)
           .Take(20)
           .ToListAsync();

        return Results.Ok(foods.Select(FoodDto.From));
    }

    // GET /api/foods/barcode/3017620422003
    private static async Task<IResult> GetByBarcode(
        string code, AppDb db, OpenFoodFactsClient off, CancellationToken ct)
    {
        if (code.Length is < 8 or > 14 || !code.All(char.IsDigit))
            return Results.BadRequest(new { error = "Ogiltig streckkod" });

        var cached = await db.Foods.FirstOrDefaultAsync(f => f.Barcode == code, ct);
        if (cached is not null) return Results.Ok(FoodDto.From(cached));

        var result = await off.LookupAsync(code, ct);

        switch (result.Status)
        {
            case LookupStatus.NotFound:
                return Results.NotFound(new { error = "Produkten hittades inte" });

            case LookupStatus.MissingProtein:
                return Results.UnprocessableEntity(new
                {
                    error = "Produkten saknar proteinvärde i databasen",
                    name = result.Name,
                });
        }

        try
        {
            db.Foods.Add(result.Food!);
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Någon annan hann spara samma streckkod, det går bra
        }

        return Results.Ok(FoodDto.From(result.Food!));
    }
}