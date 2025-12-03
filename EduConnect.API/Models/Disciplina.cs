using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.Models;

public class Disciplina
{
    public int Id { get; set; }

    [Required]
    public string Nome { get; set; } = null!;
}
