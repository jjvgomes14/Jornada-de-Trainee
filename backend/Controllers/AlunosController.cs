using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using EduConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    // ======================= LISTAGEM BÁSICA =======================

    // GET: /api/Alunos
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<Aluno>>> GetAll()
    {
        var alunos = await _db.Alunos.AsNoTracking().ToListAsync();
        return Ok(alunos);
    }

    // GET: /api/Alunos/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<Aluno>> GetById(int id)
    {
        var aluno = await _db.Alunos.FindAsync(id);
        if (aluno == null) return NotFound();

        return Ok(aluno);
    }

    // ======================= HELPERS PRIVADOS =======================

    // Ex.: "Maria Silva Souza" -> "msouza"
    private static string GerarUsernameBasico(string nomeCompleto)
    {
        if (string.IsNullOrWhiteSpace(nomeCompleto))
            throw new ArgumentException("Nome inválido.", nameof(nomeCompleto));

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

    private static string GerarSenhaAleatoria(int tamanho = 10)
    {
        // Pega só os primeiros N caracteres de um GUID sem traços
        return Guid.NewGuid()
            .ToString("N")
            .Substring(0, tamanho);
    }

    // ======================= CRIAR ALUNO =======================

    // POST: /api/Alunos
    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Aluno>> Create([FromBody] Aluno aluno)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _db.Alunos.Add(aluno);
        await _db.SaveChangesAsync();

        // Cria usuário para o aluno e tenta enviar e-mail de boas-vindas
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
            // Se der problema em usuário/e-mail, não falha o cadastro do aluno.
            // Você pode logar esse erro com algum logger se quiser.
        }

        return CreatedAtAction(nameof(GetById), new { id = aluno.Id }, aluno);
    }

    // ======================= ATUALIZAR / EXCLUIR =======================

    // PUT: /api/Alunos/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] AlunoDto dto)
    {
        if (id != dto.Id)
            return BadRequest(new { message = "Id do caminho e do corpo não conferem." });

        var aluno = await _db.Alunos.FindAsync(id);
        if (aluno == null)
            return NotFound();

        aluno.Nome = dto.Nome;
        aluno.Email = dto.Email;
        aluno.RA = dto.RA;
        aluno.Turma = dto.Turma;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: /api/Alunos/{id}
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

    // ======================= TURMAS =======================

    // GET: /api/Alunos/turmas
    [HttpGet("turmas")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<string>>> GetTurmas()
    {
        var turmas = await _db.Alunos
            .Select(a => a.Turma)
            .Where(t => t != null && t != "")
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(turmas);
    }

    // ======================= ALUNO LOGADO =======================

    // GET: /api/Alunos/me
    [HttpGet("me")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<Aluno>> GetAlunoLogado()
    {
        // Username vem do token (ClaimTypes.Name configurado no JwtService)
        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized(new { message = "Usuário não identificado no token." });

        // Carrega todos os alunos em memória pra fazer as combinações de match
        var alunos = await _db.Alunos.AsNoTracking().ToListAsync();

        var aluno = alunos.FirstOrDefault(a =>
            string.Equals(a.Email, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.RA, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.Nome, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(GerarUsernameBasico(a.Nome), username, StringComparison.OrdinalIgnoreCase) ||
            username.StartsWith(GerarUsernameBasico(a.Nome), StringComparison.OrdinalIgnoreCase)
        );

        if (aluno == null)
            return NotFound(new { message = "Não foi possível associar o usuário logado a um aluno." });

        return Ok(aluno);
    }

    // ======================= MÉDIA DO ALUNO =======================

    // GET: /api/Alunos/{id}/media
    [HttpGet("{id:int}/media")]
    [Authorize]
    public async Task<ActionResult<decimal>> GetMedia(int id)
    {
        var notas = await _db.Notas
            .Where(n => n.AlunoId == id)
            .Select(n => n.Valor)
            .ToListAsync();

        if (!notas.Any())
            return Ok(0m);

        var media = notas.Average();
        return Ok(Math.Round((decimal)media, 2));
    }
}
