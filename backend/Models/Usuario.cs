using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Usuario
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome de usuário é obrigatório.")]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    // Pode ser: "Aluno", "Professor" ou "Administrador"
    [Required]
    public string Role { get; set; } = string.Empty;

    // Se true → no primeiro login deve alterar senha
    public bool PrimeiroAcesso { get; set; } = true;
}
