using System;
using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfessoresController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly EmailService _email;

    public ProfessoresController(ApplicationDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    // ===== Helpers para usuário/senha =====

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
        var baseUsername = GerarUsernameBasico(nomeCompleto);
        var username = baseUsername;
        var sufixo = 1;

        while (await _db.Usuarios.AnyAsync(u => u.Username == username))
        {
            username = $"{baseUsername}{sufixo}";
            sufixo++;
        }

        return username;
    }

    private string GerarSenhaAleatoria(int tamanho = 8)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
        var rand = new Random();
        var buffer = new char[tamanho];

        for (int i = 0; i < tamanho; i++)
            buffer[i] = chars[rand.Next(chars.Length)];

        return new string(buffer);
    }

    // ===== Endpoints =====

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<Professor>>> GetAll()
    {
        var lista = await _db.Professores.AsNoTracking().ToListAsync();
        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<Professor>> GetById(int id)
    {
        var prof = await _db.Professores.FindAsync(id);
        return prof == null ? NotFound() : prof;
    }

    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Professor>> Create([FromBody] Professor professor)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        _db.Professores.Add(professor);
        await _db.SaveChangesAsync();

        // Cria usuário para login do professor + envia e-mail
        try
        {
            var username = await GerarUsernameUnicoAsync(professor.Nome);
            var senhaPlano = GerarSenhaAleatoria();

            var usuario = new Usuario
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(senhaPlano),
                Role = UserRoles.Professor,
                PrimeiroAcesso = true
            };

            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();

            // vincula professor ao usuário criado
            professor.UsuarioId = usuario.Id;
            await _db.SaveChangesAsync();

            var assunto = "Cadastro no Portal EduConnect (Professor)";
            var mensagem =
                $"Olá {professor.Nome},\n\n" +
                $"Você foi cadastrado como professor da disciplina \"{professor.Disciplina}\" no Portal EduConnect.\n\n" +
                "Seus dados de acesso são:\n" +
                $"Usuário: {username}\n" +
                $"Senha provisória: {senhaPlano}\n\n" +
                "No primeiro acesso você será solicitado a definir uma nova senha.\n\n" +
                "Bons estudos com sua turma!";

            await _email.EnviarAsync(professor.Email, assunto, mensagem);
        }
        catch
        {
            // se falhar o envio ou criação de usuário, não quebra o cadastro do professor
        }

        return CreatedAtAction(nameof(GetById), new { id = professor.Id }, professor);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] Professor professor)
    {
        if (id != professor.Id) return BadRequest();

        _db.Entry(professor).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Delete(int id)
    {
        var prof = await _db.Professores.FindAsync(id);
        if (prof == null) return NotFound();

        _db.Professores.Remove(prof);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Professor logado (usando userId do token JWT)
    [HttpGet("me")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<Professor>> GetMe()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var prof = await _db.Professores
            .FirstOrDefaultAsync(p => p.UsuarioId == userId);

        return prof == null ? NotFound() : prof;
    }
}
