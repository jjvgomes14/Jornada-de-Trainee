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

    public EventosController(ApplicationDbContext db)
    {
        _db = db;
    }

    // ========= HELPERS PRIVADOS =========

    /// <summary>
    /// Retorna o Id do professor vinculado ao usuário logado (ou null se não existir).
    /// Usa o "userId" do token (JwtService) para achar o Professor.UsuarioId.
    /// </summary>
    private async Task<int?> ObterProfessorIdDoUsuarioAsync()
    {
        var userIdStr = User.FindFirst("userId")?.Value;
        if (!int.TryParse(userIdStr, out var userId))
            return null;

        var profId = await _db.Professores
            .Where(p => p.UsuarioId == userId)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync();

        return profId;
    }

    private bool UsuarioPodeAlterarEvento(EventoCalendario ev)
    {
        // Admin pode alterar qualquer evento
        if (User.IsInRole(UserRoles.Administrador))
            return true;

        // Professor só pode alterar os próprios eventos
        if (User.IsInRole(UserRoles.Professor))
        {
            var profId = ObterProfessorIdDoUsuarioAsync().GetAwaiter().GetResult();
            return profId.HasValue && ev.ProfessorId == profId.Value;
        }

        return false;
    }

    // ========= LISTAR EVENTOS =========

    // GET: /api/Eventos
    // Qualquer usuário autenticado pode ver o calendário
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<EventoCalendario>>> GetAll()
    {
        var eventos = await _db.Eventos
            .AsNoTracking()
            .OrderBy(e => e.DataInicio)
            .ToListAsync();

        return Ok(eventos);
    }

    // GET: /api/Eventos/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<EventoCalendario>> GetById(int id)
    {
        var ev = await _db.Eventos.FindAsync(id);
        if (ev == null) return NotFound();
        return Ok(ev);
    }

    // ========= CRIAR EVENTO =========

    // POST: /api/Eventos
    // Somente Professor ou Administrador cria eventos
    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<EventoCalendario>> Create([FromBody] EventoCalendario dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var profId = await ObterProfessorIdDoUsuarioAsync();

        var ev = new EventoCalendario
        {
            Titulo = dto.Titulo,
            DataInicio = dto.DataInicio.Date,
            DataFim = dto.DataFim?.Date,
            ProfessorId = profId
        };

        _db.Eventos.Add(ev);
        await _db.SaveChangesAsync();

        await CriarNotificacaoAsync(
            TipoNotificacaoEvento.Criacao,
            ev,
            "Novo evento criado",
            $"{(await ObterDadosProfessorAsync(ev.ProfessorId)).profNome} ({(await ObterDadosProfessorAsync(ev.ProfessorId)).profDisc}) criou um evento em {FmtData(ev.DataInicio)}: “{ev.Titulo}”."
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

        var ev = await _db.Eventos.FindAsync(id);
        var antigoTitulo = ev.Titulo;
        var antigoInicio = ev.DataInicio;
        var antigoFim = ev.DataFim;

        if (ev == null) return NotFound();

        if (!UsuarioPodeAlterarEvento(ev))
            return Forbid();

        ev.Titulo = dto.Titulo;
        ev.DataInicio = dto.DataInicio.Date;
        ev.DataFim = dto.DataFim?.Date;
        // ProfessorId não é alterado aqui para manter o vínculo original

        await _db.SaveChangesAsync();

        var alteracoes = new List<string>();

        if (antigoTitulo != ev.Titulo)
            alteracoes.Add($"Título: “{antigoTitulo}” → “{ev.Titulo}”");

        if (antigoInicio.Date != ev.DataInicio.Date)
            alteracoes.Add($"Data: {FmtData(antigoInicio)} → {FmtData(ev.DataInicio)}");

        var fimAnt = antigoFim.HasValue ? FmtData(antigoFim.Value) : "—";
        var fimNovo = ev.DataFim.HasValue ? FmtData(ev.DataFim.Value) : "—";
        if (fimAnt != fimNovo)
            alteracoes.Add($"Fim: {fimAnt} → {fimNovo}");

        var msgAlt = alteracoes.Count == 0
            ? "Nenhuma alteração relevante detectada."
            : string.Join("\n", alteracoes);

        await CriarNotificacaoAsync(
            TipoNotificacaoEvento.Edicao,
            ev,
            "Evento editado",
            $"Alterações no evento “{ev.Titulo}” ({FmtData(ev.DataInicio)}):\n{msgAlt}"
        );

        return NoContent();
    }

    // ========= EXCLUIR EVENTO =========

    // DELETE: /api/Eventos/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ev = await _db.Eventos.FindAsync(id);
        var tituloEvento = ev.Titulo;
        var dataEvento = ev.DataInicio;
        var professorId = ev.ProfessorId;

        if (ev == null) return NotFound();

        if (!UsuarioPodeAlterarEvento(ev))
            return Forbid();

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
            EventoTitulo = tituloEvento ?? "",
            DataEvento = dataEvento,
            Titulo = "Evento excluído",
            Mensagem = $"{profNome} ({profDisc}) excluiu o evento “{tituloEvento}”.",
            CriadaEm = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GERAR NOTIFICAÇÕES
    private static string FmtData(DateTime d) => d.ToString("dd/MM/yyyy");

    private async Task<(string profNome, string profDisc)> ObterDadosProfessorAsync(int? professorId)
    {
        if (!professorId.HasValue)
            return ("Administração", "—");

        var prof = await _db.Professores.AsNoTracking().FirstOrDefaultAsync(p => p.Id == professorId.Value);
        if (prof == null) return ("Professor", "—");

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
            EventoTitulo = ev.Titulo ?? "",
            DataEvento = ev.DataInicio,
            Titulo = titulo,
            Mensagem = mensagem,
            CriadaEm = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
    }

}
