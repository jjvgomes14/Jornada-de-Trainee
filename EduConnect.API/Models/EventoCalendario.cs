using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class EventoCalendario
{
    public int Id { get; set; }

    [Required]
    public string Titulo { get; set; } = null!;

    [Required]
    public DateTime DataInicio { get; set; }

    public DateTime? DataFim { get; set; }

    public int? ProfessorId { get; set; }
    public Professor? Professor { get; set; }
}
