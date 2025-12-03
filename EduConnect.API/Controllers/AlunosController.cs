using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduConnect.Api.Services;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlunosController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly EmailService _email;

    public AlunosController(ApplicationDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<Aluno>>> GetAll()
    {
        var lista = await _db.Alunos.AsNoTracking().ToListAsync();
        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<Aluno>> GetById(int id)
    {
        var aluno = await _db.Alunos.FindAsync(id);
        return aluno == null ? NotFound() : aluno;
    }

    // Helpers para usuário/senha
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

    private string GerarSenhaAleatoria()
    {
        return Guid.NewGuid().ToString("N")[..10];
    }

    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Aluno>> Create([FromBody] Aluno aluno)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        _db.Alunos.Add(aluno);
        await _db.SaveChangesAsync();

        // Cria usuário para login do aluno
        try
        {
            var username = await GerarUsernameUnicoAsync(aluno.Nome);
            var senhaPlano = GerarSenhaAleatoria();

            var usuario = new Usuario
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(senhaPlano),
                Role = UserRoles.Aluno,
                PrimeiroAcesso = true
            };

            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();

            // Envia e-mail com credenciais
            var assunto = "Acesso ao Portal EduConnect";
            var mensagem =
                $"Olá {aluno.Nome},\n\n" +
                "Seu cadastro como aluno foi realizado com sucesso.\n\n" +
                $"Usuário de acesso: {username}\n" +
                $"Senha inicial: {senhaPlano}\n\n" +
                "No primeiro acesso você será solicitado a definir uma nova senha.\n\n" +
                "Atenciosamente,\nPortal EduConnect";

            await _email.EnviarAsync(aluno.Email, assunto, mensagem);
        }
        catch
        {
            // Se der problema no envio ou criação de usuário, não quebra o cadastro do aluno.
        }

        return CreatedAtAction(nameof(GetById), new { id = aluno.Id }, aluno);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] Aluno aluno)
    {
        if (id != aluno.Id) return BadRequest();

        _db.Entry(aluno).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Delete(int id)
    {
        var aluno = await _db.Alunos.FindAsync(id);
        if (aluno == null) return NotFound();

        _db.Alunos.Remove(aluno);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("turmas")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<string>>> GetTurmas()
    {
        var turmas = await _db.Alunos
            .Select(a => a.Turma)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();
        return Ok(turmas);
    }

    // Aluno logado (para gráfico futuro, se quiser)
    [HttpGet("me")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<ActionResult<Aluno>> GetMe()
    {
        var username = User.Identity?.Name
                       ?? User.FindFirstValue(ClaimTypes.Name)
                       ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized();

        username = username.Trim();

        // Carrega todos os alunos em memória para podermos usar GerarUsernameBasico
        var alunos = await _db.Alunos.AsNoTracking().ToListAsync();


        var aluno = alunos.FirstOrDefault(a =>
            string.Equals(a.Email, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.RA, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.Nome, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(GerarUsernameBasico(a.Nome), username, StringComparison.OrdinalIgnoreCase) ||
            username.StartsWith(GerarUsernameBasico(a.Nome), StringComparison.OrdinalIgnoreCase)
        );

        if (aluno == null)
            return NotFound();

        return Ok(aluno);
    }

    [HttpGet("{id:int}/media")]
    [Authorize]
    public async Task<ActionResult<decimal>> GetMedia(int id)
    {
        var notas = await _db.Notas
            .Where(n => n.AlunoId == id)
            .Select(n => n.Valor)
            .ToListAsync();

        if (!notas.Any()) return Ok(0m);

        var media = notas.Average();
        return Ok(Math.Round(media, 2));
    }
}
