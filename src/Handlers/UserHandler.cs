using myprofile_backend.Models.DTOs;
using myprofile_backend.Services;

namespace myprofile_backend.Handlers;

public class UserHandler
{
    private readonly IUserService _userService;

    public UserHandler(IUserService userService)
    {
        _userService = userService;
    }

    public async Task<List<UserDto>> HandleGetUsersAsync()
    {
        return await _userService.GetAllUsersAsync();
    }
}
