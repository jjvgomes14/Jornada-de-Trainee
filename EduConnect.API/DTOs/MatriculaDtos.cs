namespace EduConnect.Api.DTOs;

public class MatriculaSolicitacaoDto
{
    public string Nome { get; set; } = null!;
    public string Email { get; set; } = null!;
    public DateTime DataNascimento { get; set; }
}

public class MatriculaRespostaDto
{
    public int Id { get; set; }
    public bool Aprovar { get; set; }
    public string? Observacao { get; set; }
}
