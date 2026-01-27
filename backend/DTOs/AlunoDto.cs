using System.ComponentModel.DataAnnotations;

namespace EduConnect.API.DTOs
{
    public class AlunoDto
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
    }
}
