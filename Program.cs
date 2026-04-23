using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Configure DbContext with connection string handling
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connStringBuilder = new NpgsqlConnectionStringBuilder();
    string? dbUrl = builder.Configuration.GetConnectionString("CockroachDb");
    
    if (string.IsNullOrEmpty(dbUrl))
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("CockroachDb"));
    }
    else
    {
        var uri = new Uri(dbUrl);
        connStringBuilder.Host = uri.Host;
        connStringBuilder.Port = uri.Port;
        var userInfo = uri.UserInfo.Split(':');
        connStringBuilder.Username = userInfo[0];
        connStringBuilder.Password = userInfo[1];
        connStringBuilder.Database = uri.AbsolutePath.TrimStart('/');
        options.UseNpgsql(connStringBuilder.ConnectionString);
    }
});

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGet("/users", async (AppDbContext db) =>
{
    return await db.Users.ToListAsync();
})
.WithName("GetUsers");

app.Run();
