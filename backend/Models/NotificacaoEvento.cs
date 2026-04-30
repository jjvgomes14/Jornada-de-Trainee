using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public enum TipoNotificacaoEvento
{
    Criacao,
    Edicao,
    Exclusao
}

public class NotificacaoEvento
{
    public int Id { get; set; }

    [Required]
    public TipoNotificacaoEvento Tipo { get; set; }

    [Required]
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;

    [Required]
    public string PublicoAlvo { get; set; } = "Aluno";
    public string ProfessorNome { get; set; } = "";
    public string ProfessorDisciplina { get; set; } = "";
    
    public int? EventoId { get; set; }
    public string EventoTitulo { get; set; } = "";
    public DateTime DataEvento { get; set; }

    [Required]
    public string Titulo { get; set; } = "";

    [Required]
    public string Mensagem { get; set; } = "";
}
