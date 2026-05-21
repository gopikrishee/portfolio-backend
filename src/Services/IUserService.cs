using myprofile_backend.Models.DTOs;

namespace myprofile_backend.Services;

public interface IUserService
{
    Task<List<UserDto>> GetAllUsersAsync();
}
