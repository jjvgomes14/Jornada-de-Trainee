using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Aluno
{
    public int Id { get; set; }

    [Required]
    public string Nome { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string RA { get; set; } = null!;

    [Required]
    public string Turma { get; set; } = null!;

    public DateTime DataNascimento { get; set; }

    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
}
