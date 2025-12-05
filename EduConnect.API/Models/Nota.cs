using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Nota
{
    public int Id { get; set; }

    [Required]
    public int AlunoId { get; set; }

    [Required]
    public int ProfessorId { get; set; }

    [Required]
    public int DisciplinaId { get; set; }

    [Required]
    [Range(0, 10, ErrorMessage = "A nota deve estar entre 0 e 10.")]
    public decimal Valor { get; set; }

    [Required]
    public DateTime DataLancamento { get; set; }

    // Navegações
    public Aluno? Aluno { get; set; }
    public Professor? Professor { get; set; }
    public Disciplina? Disciplina { get; set; }
}
