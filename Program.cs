using Microsoft.EntityFrameworkCore;
using myprofile_backend.Handlers;
using myprofile_backend.Models.DTOs;
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
    if (connUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) || connUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(connUrl);
        var userInfo = uri.UserInfo.Split(':');
        var npgsqlBuilder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Username = userInfo[0],
            Password = userInfo.Length > 1 ? userInfo[1] : string.Empty,
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.VerifyFull
        };
        if (uri.Port != -1)
        {
            npgsqlBuilder.Port = uri.Port;
        }
        finalConnectionString = npgsqlBuilder.ConnectionString;
    }
    else
    {
        finalConnectionString = connUrl;
    }

    var dataSourceBuilder = new NpgsqlDataSourceBuilder(finalConnectionString);
    dataSourceBuilder.EnableDynamicJson();
    options.UseNpgsql(dataSourceBuilder.Build());
});

builder.Services.AddScoped<myprofile_backend.Services.IBlogService, myprofile_backend.Services.BlogService>();
builder.Services.AddScoped<myprofile_backend.Services.IUserService, myprofile_backend.Services.UserService>();
builder.Services.AddScoped<myprofile_backend.Handlers.BlogHandler>();
builder.Services.AddScoped<myprofile_backend.Handlers.UserHandler>();

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

app.MapGet("/users", async (UserHandler userHandler) =>
{
    return await userHandler.HandleGetUsersAsync();
})
.WithName("GetUsers");

app.MapGet("/blogslist", async (BlogHandler blogHandler, int pageNumber = 1, int pageSize = 10) =>
{
    return await blogHandler.HandleGetBlogsAsync(pageNumber, pageSize);
})
.WithName("GetBlogsList");

app.MapPost("/blogs", async (BlogHandler blogHandler, BlogDto blogDto) =>
{
    var createdBlog = await blogHandler.HandleCreateBlogAsync(blogDto);
    return Results.Created($"/blogs/{createdBlog.Id}", createdBlog);
})
.WithName("CreateBlog");

app.MapPost("/blogs/{blogId}/content", async (BlogHandler blogHandler, Guid blogId, BlogContentBlockDto contentBlockDto) =>
{
    contentBlockDto.BlogId = blogId;
    var createdBlock = await blogHandler.HandleAddContentBlockAsync(contentBlockDto);
    return Results.Created($"/blogs/{blogId}/content/{createdBlock.Id}", createdBlock);
})
.WithName("AddBlogContentBlock");

app.Run();
