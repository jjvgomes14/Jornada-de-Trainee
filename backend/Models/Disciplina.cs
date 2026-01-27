using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Disciplina
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome da disciplina é obrigatório.")]
    public string Nome { get; set; } = string.Empty;
}
