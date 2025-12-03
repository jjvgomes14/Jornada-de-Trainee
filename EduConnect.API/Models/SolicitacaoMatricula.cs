using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public enum StatusMatricula
{
    Pendente = 0,
    Aprovada = 1,
    Rejeitada = 2
}

public class SolicitacaoMatricula
{
    public int Id { get; set; }

    [Required]
    public string Nome { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public DateTime DataNascimento { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public StatusMatricula Status { get; set; } = StatusMatricula.Pendente;

    public string? Observacao { get; set; }
}
