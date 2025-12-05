using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Aluno
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "O RA é obrigatório.")]
    public string RA { get; set; } = string.Empty;

    [Required(ErrorMessage = "A turma é obrigatória.")]
    public string Turma { get; set; } = string.Empty;

    [Required(ErrorMessage = "A data de nascimento é obrigatória.")]
    public DateTime DataNascimento { get; set; }

    // Navegação: todas as notas do aluno
    public List<Nota> Notas { get; set; } = new();
}
