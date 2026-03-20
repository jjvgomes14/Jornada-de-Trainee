using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class RegistrarPresencaDto
{
    [Required]
    public int AlunoId { get; set; }

    [Required]
    public DateTime DataAula { get; set; }

    [Required]
    [MaxLength(120)]
    public string Aula { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = string.Empty;
}