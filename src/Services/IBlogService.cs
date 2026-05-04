using myprofile_backend.Models.DTOs;

namespace myprofile_backend.Services
{
    public interface IBlogService
    {
        Task<List<BlogDto>> GetBlogsWithAuthorAsync();
    }
}
