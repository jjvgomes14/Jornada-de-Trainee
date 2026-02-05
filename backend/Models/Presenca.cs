using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Presenca
{
    public int Id { get; set; }

    [Required]
    public int AlunoId { get; set; }
    public Aluno? Aluno { get; set; }

    [Required]
    public int ProfessorId { get; set; }
    public Professor? Professor { get; set; }

    [Required]
    public int DisciplinaId { get; set; }
    public Disciplina? Disciplina { get; set; }

    [Required]
    public DateTime DataAula { get; set; }

    [Required]
    public bool Presente { get; set; }

    [Required]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public DateTime? AtualizadoEm { get; set; }
}
