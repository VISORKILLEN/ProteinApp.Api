using Microsoft.EntityFrameworkCore;
using ProteinApp.Api.Data;
using ProteinApp.Api.Services;

namespace ProteinApp.Api.Extensions;

public static class ServiceCollectionExtensions
{
    // Registrerar databas, importer och OpenFoodFacts-klient
    public static IServiceCollection AddProteinServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDb>(o =>
            o.UseSqlite(config.GetConnectionString("Default")));

        services.AddHttpClient("livsmedel", c =>
        {
            c.BaseAddress = new Uri("https://dataportal.livsmedelsverket.se/livsmedel/api/v1/");
            c.Timeout = TimeSpan.FromSeconds(30);
        });

        services.AddHttpClient<OpenFoodFactsClient>(c =>
        {
            c.BaseAddress = new Uri("https://world.openfoodfacts.org/");
            c.DefaultRequestHeaders.UserAgent.ParseAdd(
                config["OpenFoodFacts:UserAgent"] ?? "ProteinApp/0.1");
            c.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddHostedService<LivsmedelImporter>();

        return services;
    }
}