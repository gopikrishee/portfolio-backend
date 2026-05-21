using Microsoft.EntityFrameworkCore;
using myprofile_backend.Models.DTOs;

namespace myprofile_backend.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        return await _db.Users
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                UserName = u.UserName,
                Email = u.Email,
                AvatarUrl = u.AvatarUrl,
                Bio = u.Bio,
                Title = u.Title,
                Location = u.Location,
                Skills = u.Skills,
                Experience = u.Experience,
                IsAdmin = u.IsAdmin,
                TotalBlogs = _db.Blogs.Count(b => b.UserId == u.UserId)
            })
            .ToListAsync();
    }
}
