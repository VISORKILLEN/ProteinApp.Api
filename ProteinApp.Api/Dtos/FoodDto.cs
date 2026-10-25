using ProteinApp.Api.Models;

namespace ProteinApp.Api.Dtos;

public record FoodDto(
    int Id, string Name, string? Brand,
    double ProteinPer100g, double? ServingGrams, string Source)
{
    public static FoodDto From(Food f) =>
        new(f.Id, f.Name, f.Brand, f.ProteinPer100g, f.ServingGrams, f.Source);
}