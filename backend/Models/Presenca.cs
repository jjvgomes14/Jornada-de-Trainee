using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public enum StatusPresenca
{
    Presente = 1,
    Falta = 2
}

public class Presenca
{
    public int Id { get; set; }

    [Required]
    public int AlunoId { get; set; }

    [Required]
    public int ProfessorId { get; set; }

    [Required]
    public DateTime DataAula { get; set; }

    [Required]
    [MaxLength(120)]
    public string Aula { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Disciplina { get; set; } = string.Empty;

    [Required]
    public StatusPresenca Status { get; set; }

    public Aluno? Aluno { get; set; }
    public Professor? Professor { get; set; }
}