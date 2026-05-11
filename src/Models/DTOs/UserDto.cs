using myprofile_backend.Models.Entities;

namespace myprofile_backend.Models.DTOs
{
    public class UserDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? Title { get; set; }
        public string? Location { get; set; }
        public List<string>? Skills { get; set; }
        public List<UserExperience>? Experience { get; set; }
        public bool IsAdmin {get; set; }
        public int TotalBlogs { get; set; }
    }
}
