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
    private readonly ILogger<AlunosController> _logger;

    public AlunosController(
        ApplicationDbContext db,
        EmailService email,
        ILogger<AlunosController> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    //Helpers
    private int? ObterUserIdDoToken()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var userId))
            return userId;

        return null;
    }

    private string? ObterRoleDoToken()
    {
        return User.FindFirstValue(ClaimTypes.Role);
    }

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
        return Guid.NewGuid()
            .ToString("N")
            .Substring(0, tamanho);
    }

    private async Task<Aluno?> ObterAlunoDoUsuarioLogadoAsync()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
            return null;

        return await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UsuarioId == userId.Value);
    }

    private async Task<bool> UsuarioAtualPodeAcessarAlunoAsync(int alunoId)
    {
        var role = ObterRoleDoToken();

        if (role == UserRoles.Administrador || role == UserRoles.Professor)
            return true;

        if (role == UserRoles.Aluno)
        {
            var userId = ObterUserIdDoToken();
            if (userId == null)
                return false;

            return await _db.Alunos.AnyAsync(a =>
                a.Id == alunoId &&
                a.UsuarioId == userId.Value);
        }

        return false;
    }

    //Listagem
    // GET: /api/Alunos
    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor}")]
    public async Task<ActionResult<IEnumerable<Aluno>>> GetAll()
    {
        var alunos = await _db.Alunos
            .AsNoTracking()
            .OrderBy(a => a.Nome)
            .ToListAsync();

        return Ok(alunos);
    }

    // GET: /api/Alunos/{id}
    [HttpGet("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor},{UserRoles.Aluno}")]
    public async Task<ActionResult<Aluno>> GetById(int id)
    {
        var podeAcessar = await UsuarioAtualPodeAcessarAlunoAsync(id);
        if (!podeAcessar)
            return Forbid();

        var aluno = await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        return Ok(aluno);
    }

    //Criar Aluno
    // POST: /api/Alunos
    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Aluno>> Create([FromBody] Aluno aluno)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailJaExiste = await _db.Alunos.AnyAsync(a => a.Email == aluno.Email);
        if (emailJaExiste)
            return Conflict(new { message = "Já existe um aluno com este e-mail." });

        var raJaExiste = await _db.Alunos.AnyAsync(a => a.RA == aluno.RA);
        if (raJaExiste)
            return Conflict(new { message = "Já existe um aluno com este RA." });

        var cpfJaExiste = await _db.Alunos.AnyAsync(a => a.CPF == aluno.CPF);
        if (cpfJaExiste)
            return Conflict(new { message = "Já existe um aluno com este CPF." });

        string username;
        string senhaPlano;

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            username = await GerarUsernameUnicoAsync(aluno.Nome);
            senhaPlano = GerarSenhaAleatoria();

            var usuario = new Usuario
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(senhaPlano),
                Role = UserRoles.Aluno,
                PrimeiroAcesso = true
            };

            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();

            aluno.UsuarioId = usuario.Id;

            _db.Alunos.Add(aluno);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();

            try
            {
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
            catch (Exception exEmail)
            {
                _logger.LogError(
                    exEmail,
                    "Aluno criado, mas houve falha ao enviar e-mail de boas-vindas. AlunoId={AlunoId}, Email={Email}",
                    aluno.Id,
                    aluno.Email);
            }

            return CreatedAtAction(nameof(GetById), new { id = aluno.Id }, aluno);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            _logger.LogError(ex, "Erro ao criar aluno e usuário vinculado.");

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Ocorreu um erro ao criar o aluno."
            });
        }
    }

    //Atualizar ou Excluir
    // PUT: /api/Alunos/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] AlunoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (id != dto.Id)
            return BadRequest(new { message = "Id do caminho e do corpo não conferem." });

        var aluno = await _db.Alunos.FindAsync(id);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var emailJaExiste = await _db.Alunos.AnyAsync(a => a.Email == dto.Email && a.Id != id);
        if (emailJaExiste)
            return Conflict(new { message = "Já existe outro aluno com este e-mail." });

        var raJaExiste = await _db.Alunos.AnyAsync(a => a.RA == dto.RA && a.Id != id);
        if (raJaExiste)
            return Conflict(new { message = "Já existe outro aluno com este RA." });

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
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            Usuario? usuario = null;

            if (aluno.UsuarioId.HasValue)
            {
                usuario = await _db.Usuarios.FindAsync(aluno.UsuarioId.Value);
            }

            _db.Alunos.Remove(aluno);
            await _db.SaveChangesAsync();

            if (usuario != null)
            {
                _db.Usuarios.Remove(usuario);
                await _db.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            _logger.LogError(ex, "Erro ao excluir aluno Id={AlunoId}", id);

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Ocorreu um erro ao excluir o aluno."
            });
        }
    }

    //Turmas
    // GET: /api/Alunos/turmas
    [HttpGet("turmas")]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor}")]
    public async Task<ActionResult<IEnumerable<string>>> GetTurmas()
    {
        var turmas = await _db.Alunos
            .AsNoTracking()
            .Select(a => a.Turma)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(turmas);
    }

    //Aluno Logado
    // GET: /api/Alunos/me
    [HttpGet("me")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<ActionResult<Aluno>> GetAlunoLogado()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
            return Unauthorized(new { message = "Usuário não identificado no token." });

        var aluno = await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UsuarioId == userId.Value);

        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado para o usuário logado." });

        return Ok(aluno);
    }

    //Média do Aluno
    // GET: /api/Alunos/{id}/media
    [HttpGet("{id:int}/media")]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor},{UserRoles.Aluno}")]
    public async Task<ActionResult<decimal>> GetMedia(int id)
    {
        var podeAcessar = await UsuarioAtualPodeAcessarAlunoAsync(id);
        if (!podeAcessar)
            return Forbid();

        var alunoExiste = await _db.Alunos.AnyAsync(a => a.Id == id);
        if (!alunoExiste)
            return NotFound(new { message = "Aluno não encontrado." });

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