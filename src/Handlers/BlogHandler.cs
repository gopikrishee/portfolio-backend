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

        public async Task<List<BlogDto>> HandleGetBlogsAsync(int pageNumber, int pageSize)
        {
            return await _blogService.GetBlogsWithAuthorAsync(pageNumber, pageSize);
        }

        public async Task<BlogDto> HandleCreateBlogAsync(BlogDto blogDto)
        {
            return await _blogService.CreateBlogAsync(blogDto);
        }

        public async Task<BlogContentBlockDto> HandleAddContentBlockAsync(BlogContentBlockDto contentBlockDto)
        {
            return await _blogService.AddContentBlockAsync(contentBlockDto);
        }
    }
}
