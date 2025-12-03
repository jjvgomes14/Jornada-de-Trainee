using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Models;

public class Nota
{
    public int Id { get; set; }

    [Range(0, 10)]
    [Precision(5, 2)] // evita warning de truncamento
    public decimal Valor { get; set; }

    public DateTime DataLancamento { get; set; } = DateTime.UtcNow;

    public int AlunoId { get; set; }
    public Aluno? Aluno { get; set; }

    public int DisciplinaId { get; set; }
    public Disciplina? Disciplina { get; set; }

    public int ProfessorId { get; set; }
    public Professor? Professor { get; set; }
}
