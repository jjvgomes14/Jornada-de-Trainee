namespace EduConnect.Api.DTOs;

public class LoginRequestDto
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class LoginResponseDto
{
    public string Token { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Role { get; set; } = null!;

    // NOVO: se true, o front deve forçar troca de senha
    public bool MustChangePassword { get; set; }
}
