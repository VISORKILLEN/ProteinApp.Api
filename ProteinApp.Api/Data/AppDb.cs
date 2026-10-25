using Microsoft.EntityFrameworkCore;
using ProteinApp.Api.Models;

namespace ProteinApp.Api.Data;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Food> Foods => Set<Food>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Food>().HasIndex(f => f.SearchName);
        b.Entity<Food>().HasIndex(f => f.Barcode).IsUnique();
    }
}