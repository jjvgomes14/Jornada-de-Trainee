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
    private readonly ILogger<ProfessoresController> _logger;

    public ProfessoresController(
        ApplicationDbContext db,
        EmailService email,
        ILogger<ProfessoresController> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    // ======================= HELPERS PRIVADOS =======================

    private int? ObterUserIdDoToken()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var userId))
            return userId;

        return null;
    }

    private async Task<bool> UsuarioAtualPodeAcessarProfessorAsync(int professorId)
    {
        if (User.IsInRole(UserRoles.Administrador))
            return true;

        if (User.IsInRole(UserRoles.Professor))
        {
            var userId = ObterUserIdDoToken();
            if (userId == null)
                return false;

            return await _db.Professores.AnyAsync(p =>
                p.Id == professorId &&
                p.UsuarioId == userId.Value);
        }

        return false;
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

    // ======================= LISTAGEM BÁSICA =======================

    // GET: /api/Professores
    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor}")]
    public async Task<ActionResult<IEnumerable<Professor>>> GetAll()
    {
        var professores = await _db.Professores
            .AsNoTracking()
            .OrderBy(p => p.Nome)
            .ToListAsync();

        return Ok(professores);
    }

    // GET: /api/Professores/{id}
    [HttpGet("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Administrador},{UserRoles.Professor}")]
    public async Task<ActionResult<Professor>> GetById(int id)
    {
        var podeAcessar = await UsuarioAtualPodeAcessarProfessorAsync(id);
        if (!podeAcessar && !User.IsInRole(UserRoles.Administrador))
            return Forbid();

        var professor = await _db.Professores
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (professor == null)
            return NotFound(new { message = "Professor não encontrado." });

        return Ok(professor);
    }

    // ======================= CRIAR PROFESSOR =======================

    // POST: /api/Professores
    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Professor>> Create([FromBody] Professor professor)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailNormalizado = professor.Email.Trim();

        var emailJaExiste = await _db.Professores.AnyAsync(p => p.Email == emailNormalizado);
        if (emailJaExiste)
        {
            return Conflict(new
            {
                message = "Já existe um professor com este e-mail."
            });
        }

        string username;
        string senhaPlano;

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            username = await GerarUsernameUnicoAsync(professor.Nome);
            senhaPlano = GerarSenhaAleatoria();

            var usuario = new Usuario
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(senhaPlano),
                Role = UserRoles.Professor,
                PrimeiroAcesso = true
            };

            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();

            professor.Email = emailNormalizado;
            professor.UsuarioId = usuario.Id;

            _db.Professores.Add(professor);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();

            try
            {
                var assunto = "Acesso ao Portal EduConnect (Professor)";
                var mensagem =
                    $"Olá {professor.Nome},\n\n" +
                    $"Você foi cadastrado como professor da disciplina \"{professor.Disciplina}\" no Portal EduConnect.\n\n" +
                    "Seus dados de acesso são:\n" +
                    $"Usuário: {username}\n" +
                    $"Senha provisória: {senhaPlano}\n\n" +
                    "No primeiro acesso você será solicitado a definir uma nova senha.\n\n" +
                    "Atenciosamente,\nPortal EduConnect";

                await _email.EnviarAsync(professor.Email, assunto, mensagem);
            }
            catch (Exception exEmail)
            {
                _logger.LogError(
                    exEmail,
                    "Professor criado, mas houve falha ao enviar e-mail. ProfessorId={ProfessorId}, Email={Email}",
                    professor.Id,
                    professor.Email);
            }

            return CreatedAtAction(nameof(GetById), new { id = professor.Id }, professor);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            _logger.LogError(ex, "Erro ao criar professor e usuário vinculado.");

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Ocorreu um erro ao criar o professor."
            });
        }
    }

    // ======================= ATUALIZAR PROFESSOR =======================

    // PUT: /api/Professores/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] Professor professor)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (id != professor.Id)
        {
            return BadRequest(new
            {
                message = "Id do caminho e do corpo não conferem."
            });
        }

        var professorExistente = await _db.Professores.FindAsync(id);
        if (professorExistente == null)
        {
            return NotFound(new
            {
                message = "Professor não encontrado."
            });
        }

        var emailNormalizado = professor.Email.Trim();

        var emailJaExiste = await _db.Professores.AnyAsync(p =>
            p.Email == emailNormalizado &&
            p.Id != id);

        if (emailJaExiste)
        {
            return Conflict(new
            {
                message = "Já existe outro professor com este e-mail."
            });
        }

        professorExistente.Nome = professor.Nome;
        professorExistente.Email = emailNormalizado;
        professorExistente.Disciplina = professor.Disciplina;
        professorExistente.DataNascimento = professor.DataNascimento;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ======================= EXCLUIR PROFESSOR =======================

    // DELETE: /api/Professores/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Delete(int id)
    {
        var professor = await _db.Professores.FindAsync(id);
        if (professor == null)
        {
            return NotFound(new
            {
                message = "Professor não encontrado."
            });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            Usuario? usuario = null;

            if (professor.UsuarioId.HasValue)
            {
                usuario = await _db.Usuarios.FindAsync(professor.UsuarioId.Value);
            }

            _db.Professores.Remove(professor);
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

            _logger.LogError(ex, "Erro ao excluir professor Id={ProfessorId}", id);

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Ocorreu um erro ao excluir o professor."
            });
        }
    }

    // ======================= PROFESSOR LOGADO =======================

    // GET: /api/Professores/me
    [HttpGet("me")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<Professor>> GetMe()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
        {
            return Unauthorized(new
            {
                message = "Usuário não identificado no token."
            });
        }

        var professor = await _db.Professores
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UsuarioId == userId.Value);

        if (professor == null)
        {
            return NotFound(new
            {
                message = "Professor não encontrado para o usuário logado."
            });
        }

        return Ok(professor);
    }
}