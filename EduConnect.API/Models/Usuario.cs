using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Usuario
{
    public int Id { get; set; }

    [Required]
    public string Username { get; set; } = null!;

    [Required]
    public string PasswordHash { get; set; } = null!;

    [Required]
    public string Role { get; set; } = UserRoles.Aluno;

    // NOVO: indica se o usuário precisa trocar a senha no primeiro login
    public bool PrimeiroAcesso { get; set; } = true;
}
