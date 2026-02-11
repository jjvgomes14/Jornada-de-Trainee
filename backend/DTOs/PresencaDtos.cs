using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class PresencaItemDto
{
    [Required]
    public int AlunoId { get; set; }

    [Required]
    public bool Presente { get; set; }
}

public class PresencaLoteDto
{
    
    [Required]
    public DateTime DataAula { get; set; }

    public string? Turma { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Envie ao menos 1 aluno.")]
    public List<PresencaItemDto> Itens { get; set; } = new();
}
