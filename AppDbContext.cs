using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell EF Core that the DB generates the UUID and Date automatically
        // modelBuilder.Entity<Order>()
        //     .Property(o => o.OrderId)
        //     .HasDefaultValueSql("gen_random_uuid()");

        // modelBuilder.Entity<Order>()
        //     .Property(o => o.OrderDate)
        //     .HasDefaultValueSql("now()");
    }
}
