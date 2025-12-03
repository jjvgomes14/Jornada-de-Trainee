// MatriculasController.cs
using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatriculasController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly EmailService _email;

    public MatriculasController(ApplicationDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    [HttpPost("solicitar")]
    [AllowAnonymous]
    public async Task<ActionResult> Solicitar([FromBody] MatriculaSolicitacaoDto dto)
    {
        var ent = new SolicitacaoMatricula
        {
            Nome = dto.Nome,
            Email = dto.Email,
            DataNascimento = dto.DataNascimento
        };

        _db.SolicitacoesMatricula.Add(ent);
        await _db.SaveChangesAsync();

        // E-mail automático simples
        try
        {
            const string texto = "Matricula realizada com sucesso";
            await _email.EnviarAsync(ent.Email, "Matrícula realizada com sucesso", texto);
        }
        catch
        {
            // não quebra o fluxo
        }

        return Ok(new { message = "Solicitação registrada com sucesso." });
    }

    [HttpGet("pendentes")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<IEnumerable<SolicitacaoMatricula>>> GetPendentes()
    {
        var lista = await _db.SolicitacoesMatricula
            .Where(s => s.Status == StatusMatricula.Pendente)
            .OrderBy(s => s.CriadoEm)
            .ToListAsync();

        return Ok(lista);
    }

    [HttpPost("responder")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Responder([FromBody] MatriculaRespostaDto dto)
    {
        var sol = await _db.SolicitacoesMatricula.FindAsync(dto.Id);
        if (sol == null) return NotFound();

        sol.Status = dto.Aprovar ? StatusMatricula.Aprovada : StatusMatricula.Rejeitada;
        sol.Observacao = dto.Observacao;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private string GerarUsernameBasico(string nomeCompleto)
    {
        if (string.IsNullOrWhiteSpace(nomeCompleto))
            throw new ArgumentException("Nome inválido.");

        var partes = nomeCompleto
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var primeiraLetra = char.ToLowerInvariant(partes[0][0]);
        var ultimoSobrenome = partes.Length > 1
            ? partes[^1].ToLowerInvariant()
            : partes[0].ToLowerInvariant();

        return $"{primeiraLetra}{ultimoSobrenome}";
    }

    // Garante unicidade acrescentando número se já existir
    private async Task<string> GerarUsernameUnicoAsync(string nomeCompleto)
    {
        var baseUser = GerarUsernameBasico(nomeCompleto);
        var username = baseUser;
        var sufixo = 1;

        while (await _db.Usuarios.AnyAsync(u => u.Username == username))
        {
            sufixo++;
            username = $"{baseUser}{sufixo}";
        }

        return username;
    }

    // Gera senha aleatória simples (8 caracteres)
    private string GerarSenhaAleatoria()
    {
        return Guid.NewGuid().ToString("N")[..10]; // 10 caracteres
    }

}
