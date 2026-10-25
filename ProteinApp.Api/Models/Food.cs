namespace ProteinApp.Api.Models;

public class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string SearchName { get; set; } = "";   // gemener, för sökning med åäö
    public string? Brand { get; set; }
    public string? Barcode { get; set; }
    public double ProteinPer100g { get; set; }
    public double? ServingGrams { get; set; }
    public string Source { get; set; } = "";       // "livsmedelsverket" eller "openfoodfacts"
}