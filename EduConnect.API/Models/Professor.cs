using EduConnect.Api.Models;
using System.ComponentModel.DataAnnotations;

public class Professor
{
    public int Id { get; set; }

    [Required]
    public string Nome { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    public DateTime DataNascimento { get; set; }

    [Required]
    public string Disciplina { get; set; } = null!;

    // NOVO: vínculo com usuário de login
    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
}
