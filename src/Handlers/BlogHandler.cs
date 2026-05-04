using myprofile_backend.Models.DTOs;
using myprofile_backend.Services;

namespace myprofile_backend.Handlers
{
    public class BlogHandler
    {
        private readonly IBlogService _blogService;

        public BlogHandler(IBlogService blogService)
        {
            _blogService = blogService;
        }

        public async Task<List<BlogDto>> HandleGetBlogsAsync()
        {
            return await _blogService.GetBlogsWithAuthorAsync();
        }
    }
}
