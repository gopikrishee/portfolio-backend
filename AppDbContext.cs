using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Order> Orders { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell EF Core that the DB generates the UUID and Date automatically
        modelBuilder.Entity<Order>()
            .Property(o => o.OrderId)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<Order>()
            .Property(o => o.OrderDate)
            .HasDefaultValueSql("now()");
    }
}



[Table("orders", Schema = "public")]
public class Order
{
    [Key]
    [Column("order_id")]
    public Guid OrderId { get; set; }

    [Column("customer_id")]
    public Guid CustomerId { get; set; }

    [Column("order_date")]
    public DateTime? OrderDate { get; set; }

    [Column("total_amount")]
    public decimal? TotalAmount { get; set; }

    [Column("status")]
    public string? Status { get; set; }
}

[Table("users", Schema = "public")]
public class User
{
    [Key]
    [Column("id")]
    public Guid UserId { get; set; }
    
    [Column("username")]
    public required string UserName { get; set; }
    
    [Column("email")]
    public required string Email { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl {get; set; }

    [Column("bio"), MaxLength(500)]
    public string? Bio {get; set; }

    [Column("designation"), MaxLength(255)]
    public string? Designation { get; set; }

}
