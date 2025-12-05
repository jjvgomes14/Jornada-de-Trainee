using System.ComponentModel.DataAnnotations;

namespace EduConnect.Api.DTOs;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "A nova senha é obrigatória.")]
    [MinLength(6, ErrorMessage = "A senha deve ter pelo menos 6 caracteres.")]
    public string NovaSenha { get; set; } = string.Empty;
}
