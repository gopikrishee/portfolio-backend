using myprofile_backend.Models.DTOs;

namespace myprofile_backend.Services
{
    public interface IBlogService
    {
        Task<List<BlogDto>> GetBlogsWithAuthorAsync(int pageNumber, int pageSize);
        Task<BlogDto> CreateBlogAsync(BlogDto blogDto);
        Task<BlogContentBlockDto> AddContentBlockAsync(BlogContentBlockDto contentBlockDto);
    }
}
