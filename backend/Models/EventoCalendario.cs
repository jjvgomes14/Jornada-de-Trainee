using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class EventoCalendario
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O título do evento é obrigatório.")]
    public string Titulo { get; set; } = string.Empty;

    [Required(ErrorMessage = "A data de início é obrigatória.")]
    public DateTime DataInicio { get; set; }

    public DateTime? DataFim { get; set; }

    public int? ProfessorId { get; set; }
}
