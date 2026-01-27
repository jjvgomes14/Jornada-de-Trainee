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

    // ======================= LISTAGEM BÁSICA =======================

    // GET: /api/Professores
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<Professor>>> GetAll()
    {
        var professores = await _db.Professores.AsNoTracking().ToListAsync();
        return Ok(professores);
    }

    // GET: /api/Professores/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<Professor>> GetById(int id)
    {
        var professor = await _db.Professores.FindAsync(id);
        if (professor == null) return NotFound();
        return Ok(professor);
    }

    // ======================= HELPERS PRIVADOS =======================

    // Ex.: "Carlos Silva Souza" -> "csouza"
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

    // ======================= CRIAR PROFESSOR =======================

    // POST: /api/Professores
    [HttpPost]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<Professor>> Create([FromBody] Professor professor)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Salva o professor primeiro
        _db.Professores.Add(professor);
        await _db.SaveChangesAsync();

        // Cria usuário vinculado + e-mail com credenciais
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

            // vincula o professor ao usuário criado
            professor.UsuarioId = usuario.Id;
            await _db.SaveChangesAsync();

            var assunto = "Acesso ao Portal EduConnect (Professor)";
            var mensagem =
                $"Olá {professor.Nome},\n\n" +
                $"Você foi cadastrado como professor da disciplina \"{professor.Disciplina}\" no Portal EduConnect.\n\n" +
                "Seus dados de acesso são:\n" +
                $"Usuário: {username}\n" +
                $"Senha provisória: {senhaPlano}\n\n" +
                "No primeiro acesso você será solicitado a definir uma nova senha.\n\n" +
                "Bons estudos com sua turma!\nPortal EduConnect";

            await _email.EnviarAsync(professor.Email, assunto, mensagem);
        }
        catch
        {
            // se der erro ao criar usuário ou enviar e-mail,
            // o professor continua cadastrado; aqui você poderia logar o erro
        }

        return CreatedAtAction(nameof(GetById), new { id = professor.Id }, professor);
    }

    // ======================= ATUALIZAR / EXCLUIR =======================

    // PUT: /api/Professores/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Update(int id, [FromBody] Professor professor)
    {
        if (id != professor.Id)
            return BadRequest(new { message = "Id do caminho e do corpo não conferem." });

        _db.Entry(professor).State = EntityState.Modified;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            var existe = await _db.Professores.AnyAsync(p => p.Id == id);
            if (!existe)
                return NotFound();

            throw; // se for outro problema, deixa a exception subir
        }

        return NoContent();
    }

    // DELETE: /api/Professores/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Delete(int id)
    {
        var professor = await _db.Professores.FindAsync(id);
        if (professor == null) return NotFound();

        _db.Professores.Remove(professor);
        await _db.SaveChangesAsync();

        // opcional: você poderia remover o Usuario vinculado aqui,
        // se não quiser deixar usuário "órfão"

        return NoContent();
    }

    // ======================= PROFESSOR LOGADO =======================

    // GET: /api/Professores/me
    [HttpGet("me")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<Professor>> GetMe()
    {
        // userId vem da claim adicionada no JwtService
        var userIdStr = User.FindFirstValue("userId");
        if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "Usuário não identificado no token." });

        var prof = await _db.Professores
            .FirstOrDefaultAsync(p => p.UsuarioId == userId);

        if (prof == null)
            return NotFound(new { message = "Professor não encontrado para o usuário logado." });

        return Ok(prof);
    }
}
