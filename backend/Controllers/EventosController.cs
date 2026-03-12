using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventosController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<EventosController> _logger;

    public EventosController(ApplicationDbContext db, ILogger<EventosController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ========= HELPERS PRIVADOS =========

    private int? ObterUserIdDoToken()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var userId))
            return userId;

        return null;
    }

    private async Task<int?> ObterProfessorIdDoUsuarioAsync()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
            return null;

        return await _db.Professores
            .AsNoTracking()
            .Where(p => p.UsuarioId == userId.Value)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<bool> UsuarioPodeAlterarEventoAsync(EventoCalendario ev)
    {
        if (User.IsInRole(UserRoles.Administrador))
            return true;

        if (User.IsInRole(UserRoles.Professor))
        {
            var professorId = await ObterProfessorIdDoUsuarioAsync();
            return professorId.HasValue && ev.ProfessorId == professorId.Value;
        }

        return false;
    }

    private static string FmtData(DateTime d) => d.ToString("dd/MM/yyyy");

    private async Task<(string profNome, string profDisc)> ObterDadosProfessorAsync(int? professorId)
    {
        if (!professorId.HasValue)
            return ("Administração", "—");

        var prof = await _db.Professores
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == professorId.Value);

        if (prof == null)
            return ("Professor", "—");

        return (prof.Nome, prof.Disciplina);
    }

    private async Task CriarNotificacaoAsync(
        TipoNotificacaoEvento tipo,
        EventoCalendario ev,
        string titulo,
        string mensagem)
    {
        var (profNome, profDisc) = await ObterDadosProfessorAsync(ev.ProfessorId);

        _db.NotificacoesEventos.Add(new NotificacaoEvento
        {
            Tipo = tipo,
            PublicoAlvo = "Aluno",
            ProfessorNome = profNome,
            ProfessorDisciplina = profDisc,
            EventoId = ev.Id,
            EventoTitulo = ev.Titulo ?? string.Empty,
            DataEvento = ev.DataInicio,
            Titulo = titulo,
            Mensagem = mensagem,
            CriadaEm = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
    }

    // ========= LISTAR EVENTOS =========

    // GET: /api/Eventos
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<EventoCalendario>>> GetAll()
    {
        var eventos = await _db.Eventos
            .AsNoTracking()
            .OrderBy(e => e.DataInicio)
            .ThenBy(e => e.Titulo)
            .ToListAsync();

        return Ok(eventos);
    }

    // GET: /api/Eventos/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<EventoCalendario>> GetById(int id)
    {
        var ev = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev == null)
            return NotFound(new { message = "Evento não encontrado." });

        return Ok(ev);
    }

    // ========= CRIAR EVENTO =========

    // POST: /api/Eventos
    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<EventoCalendario>> Create([FromBody] EventoCalendario dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (dto.DataFim.HasValue && dto.DataFim.Value.Date < dto.DataInicio.Date)
        {
            return BadRequest(new
            {
                message = "A data final não pode ser menor que a data inicial."
            });
        }

        int? professorId = null;

        if (User.IsInRole(UserRoles.Professor))
        {
            professorId = await ObterProfessorIdDoUsuarioAsync();
            if (!professorId.HasValue)
                return Forbid();
        }

        var ev = new EventoCalendario
        {
            Titulo = dto.Titulo.Trim(),
            DataInicio = dto.DataInicio.Date,
            DataFim = dto.DataFim?.Date,
            ProfessorId = professorId
        };

        _db.Eventos.Add(ev);
        await _db.SaveChangesAsync();

        var (profNome, profDisc) = await ObterDadosProfessorAsync(ev.ProfessorId);

        await CriarNotificacaoAsync(
            TipoNotificacaoEvento.Criacao,
            ev,
            "Novo evento criado",
            $"{profNome} ({profDisc}) criou um evento em {FmtData(ev.DataInicio)}: “{ev.Titulo}”."
        );

        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
    }

    // ========= ATUALIZAR EVENTO =========

    // PUT: /api/Eventos/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> Update(int id, [FromBody] EventoCalendario dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (dto.DataFim.HasValue && dto.DataFim.Value.Date < dto.DataInicio.Date)
        {
            return BadRequest(new
            {
                message = "A data final não pode ser menor que a data inicial."
            });
        }

        var ev = await _db.Eventos.FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null)
            return NotFound(new { message = "Evento não encontrado." });

        var podeAlterar = await UsuarioPodeAlterarEventoAsync(ev);
        if (!podeAlterar)
            return Forbid();

        var antigoTitulo = ev.Titulo;
        var antigoInicio = ev.DataInicio;
        var antigoFim = ev.DataFim;

        ev.Titulo = dto.Titulo.Trim();
        ev.DataInicio = dto.DataInicio.Date;
        ev.DataFim = dto.DataFim?.Date;

        await _db.SaveChangesAsync();

        var alteracoes = new List<string>();

        if (!string.Equals(antigoTitulo, ev.Titulo, StringComparison.Ordinal))
            alteracoes.Add($"Título: “{antigoTitulo}” → “{ev.Titulo}”");

        if (antigoInicio.Date != ev.DataInicio.Date)
            alteracoes.Add($"Data: {FmtData(antigoInicio)} → {FmtData(ev.DataInicio)}");

        var fimAntigo = antigoFim.HasValue ? FmtData(antigoFim.Value) : "—";
        var fimNovo = ev.DataFim.HasValue ? FmtData(ev.DataFim.Value) : "—";

        if (!string.Equals(fimAntigo, fimNovo, StringComparison.Ordinal))
            alteracoes.Add($"Fim: {fimAntigo} → {fimNovo}");

        var mensagemAlteracoes = alteracoes.Count == 0
            ? "Nenhuma alteração relevante detectada."
            : string.Join("\n", alteracoes);

        await CriarNotificacaoAsync(
            TipoNotificacaoEvento.Edicao,
            ev,
            "Evento editado",
            $"Alterações no evento “{ev.Titulo}” ({FmtData(ev.DataInicio)}):\n{mensagemAlteracoes}"
        );

        return NoContent();
    }

    // ========= EXCLUIR EVENTO =========

    // DELETE: /api/Eventos/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ev = await _db.Eventos.FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null)
            return NotFound(new { message = "Evento não encontrado." });

        var podeAlterar = await UsuarioPodeAlterarEventoAsync(ev);
        if (!podeAlterar)
            return Forbid();

        var tituloEvento = ev.Titulo;
        var dataEvento = ev.DataInicio;
        var professorId = ev.ProfessorId;

        _db.Eventos.Remove(ev);
        await _db.SaveChangesAsync();

        var (profNome, profDisc) = await ObterDadosProfessorAsync(professorId);

        _db.NotificacoesEventos.Add(new NotificacaoEvento
        {
            Tipo = TipoNotificacaoEvento.Exclusao,
            PublicoAlvo = "Aluno",
            ProfessorNome = profNome,
            ProfessorDisciplina = profDisc,
            EventoId = id,
            EventoTitulo = tituloEvento ?? string.Empty,
            DataEvento = dataEvento,
            Titulo = "Evento excluído",
            Mensagem = $"{profNome} ({profDisc}) excluiu o evento “{tituloEvento}”.",
            CriadaEm = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return NoContent();
    }
}