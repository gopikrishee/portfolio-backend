using Microsoft.EntityFrameworkCore;
using myprofile_backend.Models.DTOs;
using myprofile_backend.Models.Entities;

namespace myprofile_backend.Services
{
    public class BlogService : IBlogService
    {
        private readonly AppDbContext _context;

        public BlogService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<BlogDto>> GetBlogsWithAuthorAsync(int pageNumber, int pageSize)
        {
            return await _context.Blogs
                .Include(b => b.Author)
                .OrderByDescending(b => b.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new BlogDto
                {
                    Id = b.Id,
                    UserId = b.UserId,
                    UserName = b.Author.UserName,
                    Title = b.Title,
                    Slug = b.Slug,
                    Excerpt = b.Excerpt,
                    CoverImageUrl = b.CoverImageUrl,
                    Status = b.Status,
                    Tags = b.Tags,
                    ViewCount = b.ViewCount,
                    PublishedAt = b.PublishedAt,
                    CreatedAt = b.CreatedAt,
                    UpdatedAt = b.UpdatedAt
                })
                .ToListAsync();
        }
    }
}
