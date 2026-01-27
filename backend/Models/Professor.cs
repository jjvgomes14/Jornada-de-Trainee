using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Professor
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A disciplina é obrigatória.")]
    public string Disciplina { get; set; } = string.Empty;

    [Required(ErrorMessage = "A data de nascimento é obrigatória.")]
    public DateTime DataNascimento { get; set; }

    // FK opcional para a tabela Usuarios (login)
    public int? UsuarioId { get; set; }
}
