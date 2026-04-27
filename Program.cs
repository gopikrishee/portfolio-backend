using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Configure DbContext with connection string handling
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connUrl = Environment.GetEnvironmentVariable("COCKROACHDB_URL") 
        ?? Environment.GetEnvironmentVariable("COCKROACHDB_URL", EnvironmentVariableTarget.User)
        ?? builder.Configuration.GetConnectionString("CockroachDb");

    if (string.IsNullOrEmpty(connUrl))
    {
        throw new InvalidOperationException("Connection string 'CockroachDb' not found and 'COCKROACHDB_URL' environment variable is not set.");
    }

    string finalConnectionString;
    if (connUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(connUrl);
        var userInfo = uri.UserInfo.Split(':');
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port,
            Username = userInfo[0],
            Password = userInfo.Length > 1 ? userInfo[1] : string.Empty,
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.VerifyFull
        };
        finalConnectionString = builder.ConnectionString;
    }
    else
    {
        finalConnectionString = connUrl;
    }

    var dataSourceBuilder = new NpgsqlDataSourceBuilder(finalConnectionString);
    dataSourceBuilder.EnableDynamicJson();
    options.UseNpgsql(dataSourceBuilder.Build());
});

builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("https://gopikrishee.in", "http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();

app.MapGet("/users", async (AppDbContext db) =>
{
    return await db.Users.ToListAsync();
})
.WithName("GetUsers");

app.MapGet("/sample", async (AppDbContext db) =>
{
    return "Sample endpoint";
})
.WithName("Sample");

app.Run();
