using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class LoginRequestDto
{
    [Required(ErrorMessage = "O nome de usuário é obrigatório.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
}