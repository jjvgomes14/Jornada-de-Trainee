using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Aluno
{
    public int Id { get; set; }

    [Required]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string RA { get; set; } = string.Empty;

    [Required]
    public string Turma { get; set; } = string.Empty;

    [Required]
    public string Curso { get; set; } = string.Empty;

    [Required]
    public DateTime DataNascimento { get; set; }

    [Required]
    public string RG { get; set; } = string.Empty;

    [Required]
    public string CPF { get; set; } = string.Empty;

    [Required]
    public string Celular { get; set; } = string.Empty;

    [Required]
    public string CEP { get; set; } = string.Empty;

    [Required]
    public string Estado { get; set; } = string.Empty;

    [Required]
    public string Cidade { get; set; } = string.Empty;

    [Required]
    public string Bairro { get; set; } = string.Empty;

    [Required]
    public string Rua { get; set; } = string.Empty;

    [Required]
    public string NumeroCasa { get; set; } = string.Empty;

    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
}