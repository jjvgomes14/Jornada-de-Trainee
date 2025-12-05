namespace EduConnect.Api.Models;
using System.ComponentModel.DataAnnotations;

public enum StatusMatricula
{
    Pendente = 0,
    Aprovada = 1,
    Rejeitada = 2
}
public class SolicitacaoMatricula
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A data de nascimento é obrigatória.")]
    public DateTime DataNascimento { get; set; }

    // Quando a solicitação foi criada
    [Required]
    public DateTime CriadoEm { get; set; }

    // Status da matrícula: Pendente, Aprovada ou Rejeitada
    [Required]
    public StatusMatricula Status { get; set; } = StatusMatricula.Pendente;

    // Campo opcional para o admin deixar observações
    public string? Observacao { get; set; }
}
