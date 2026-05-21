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

        public async Task<BlogDto> CreateBlogAsync(BlogDto blogDto)
        {
            var blog = new Blog
            {
                Id = Guid.NewGuid(),
                UserId = blogDto.UserId,
                Title = blogDto.Title,
                Slug = blogDto.Slug,
                Excerpt = blogDto.Excerpt,
                CoverImageUrl = blogDto.CoverImageUrl,
                Status = blogDto.Status,
                Tags = blogDto.Tags,
                PublishedAt = blogDto.PublishedAt,
                Author = await _context.Users.FindAsync(blogDto.UserId) 
                    ?? throw new InvalidOperationException("Author not found.")
            };

            _context.Blogs.Add(blog);
            await _context.SaveChangesAsync();

            blogDto.Id = blog.Id;
            blogDto.CreatedAt = blog.CreatedAt;
            blogDto.UpdatedAt = blog.UpdatedAt;

            return blogDto;
        }

        public async Task<BlogContentBlockDto> AddContentBlockAsync(BlogContentBlockDto contentBlockDto)
        {
            var blog = await _context.Blogs.FindAsync(contentBlockDto.BlogId)
                ?? throw new InvalidOperationException("Blog not found.");

            var contentBlock = new BlogContentBlock
            {
                Id = Guid.NewGuid(),
                BlogId = contentBlockDto.BlogId,
                Blog = blog,
                BlockType = contentBlockDto.BlockType,
                Position = contentBlockDto.Position,
                TextContent = contentBlockDto.TextContent,
                ImageUrl = contentBlockDto.ImageUrl,
                ImageAlt = contentBlockDto.ImageAlt,
                ImageCaption = contentBlockDto.ImageCaption,
                CodeSnippet = contentBlockDto.CodeSnippet,
                CodeLanguage = contentBlockDto.CodeLanguage
            };

            _context.BlogContentBlocks.Add(contentBlock);
            await _context.SaveChangesAsync();

            contentBlockDto.Id = contentBlock.Id;
            contentBlockDto.CreatedAt = contentBlock.CreatedAt;

            return contentBlockDto;
        }
    }
}
