using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class MatriculaSolicitacaoDto
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A data de nascimento é obrigatória.")]
    public DateTime DataNascimento { get; set; }
}

public class MatriculaRespostaDto
{
    [Required(ErrorMessage = "O Id da solicitação é obrigatório.")]
    public int Id { get; set; }

    [Required]
    public bool Aprovar { get; set; }

    // Observação opcional (ex.: motivo da rejeição)
    public string? Observacao { get; set; }
}