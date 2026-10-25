using Microsoft.EntityFrameworkCore;
using ProteinApp.Api.Data;

namespace ProteinApp.Api.Endpoints;

public static class StatusEndpoints
{

    // GET /api/status
    public static IEndpointRouteBuilder MapStatusEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/status", async (AppDb db) =>
            new { foods = await db.Foods.CountAsync() });

        return app;
    }
}