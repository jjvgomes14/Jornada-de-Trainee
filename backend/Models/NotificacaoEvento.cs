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

    // “Aluno” por enquanto (notificações globais para todos os alunos)
    [Required]
    public string PublicoAlvo { get; set; } = "Aluno";

    // Dados do professor
    public string ProfessorNome { get; set; } = "";
    public string ProfessorDisciplina { get; set; } = "";

    // Evento
    public int? EventoId { get; set; }
    public string EventoTitulo { get; set; } = "";
    public DateTime DataEvento { get; set; }

    // Texto pronto pro front exibir
    [Required]
    public string Titulo { get; set; } = "";

    [Required]
    public string Mensagem { get; set; } = "";
}
