using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class NotaCreateDto
{
    [Required(ErrorMessage = "O alunoId é obrigatório.")]
    public int AlunoId { get; set; }

    [Required(ErrorMessage = "O valor da nota é obrigatório.")]
    [Range(0, 10, ErrorMessage = "A nota deve estar entre 0 e 10.")]
    public decimal Valor { get; set; }
}
