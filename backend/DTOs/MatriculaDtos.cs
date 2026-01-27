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

    [Required(ErrorMessage = "O RG é obrigatório.")]
    public string RG { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CPF é obrigatório.")]
    public string CPF { get; set; } = string.Empty;

    [Required(ErrorMessage = "O celular é obrigatório.")]
    public string Celular { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CEP é obrigatório.")]
    public string CEP { get; set; } = string.Empty;

    [Required(ErrorMessage = "O estado (UF) é obrigatório.")]
    public string Estado { get; set; } = string.Empty;

    [Required(ErrorMessage = "A cidade é obrigatória.")]
    public string Cidade { get; set; } = string.Empty;

    [Required(ErrorMessage = "O bairro é obrigatório.")]
    public string Bairro { get; set; } = string.Empty;

    [Required(ErrorMessage = "A rua é obrigatória.")]
    public string Rua { get; set; } = string.Empty;

    [Required(ErrorMessage = "O número é obrigatório.")]
    public string NumeroCasa { get; set; } = string.Empty;
}

public class MatriculaRespostaDto
{
    [Required(ErrorMessage = "O Id da solicitação é obrigatório.")]
    public int Id { get; set; }

    [Required]
    public bool Aprovar { get; set; }

    public string? RA { get; set; }
    public string? Turma { get; set; }

    public string? Observacao { get; set; }
}