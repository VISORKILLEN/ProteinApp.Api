using ProteinApp.Api.Data;
using ProteinApp.Api.Endpoints;
using ProteinApp.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProteinServices(builder.Configuration);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDb>().Database.EnsureCreated();
}

app.MapStatusEndpoints();
app.MapFoodEndpoints();

app.Run();