using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PresencasController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PresencasController(ApplicationDbContext db)
    {
        _db = db;
    }

    // ==========================
    // HELPERS (PROFESSOR)
    // ==========================

    private async Task<Professor?> ObterProfessorLogadoAsync()
    {
        var userIdStr = User.FindFirst("userId")?.Value;
        if (!int.TryParse(userIdStr, out var userId))
            return null;

        return await _db.Professores.FirstOrDefaultAsync(p => p.UsuarioId == userId);
    }

    private async Task<Disciplina> ObterOuCriarDisciplinaAsync(string nome)
    {
        var nomeNormalizado = nome.Trim();

        var disciplina = await _db.Disciplinas.FirstOrDefaultAsync(d => d.Nome == nomeNormalizado);
        if (disciplina != null)
            return disciplina;

        disciplina = new Disciplina { Nome = nomeNormalizado };
        _db.Disciplinas.Add(disciplina);
        await _db.SaveChangesAsync();

        return disciplina;
    }

    private static DateTime NormalizarDataUtc(DateTime data)
    {
        var d = data.Date;
        return DateTime.SpecifyKind(d, DateTimeKind.Utc);
    }

    // ==========================
    // HELPERS (ALUNO) - MESMO CRITÉRIO DO /Alunos/me
    // ==========================

    private static string GerarUsernameBasico(string nomeCompleto)
    {
        var partes = nomeCompleto
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var primeiraLetra = char.ToLowerInvariant(partes[0][0]);
        var ultimoSobrenome = partes.Length > 1
            ? partes[^1].ToLowerInvariant()
            : partes[0].ToLowerInvariant();

        return $"{primeiraLetra}{ultimoSobrenome}";
    }

    private async Task<Aluno?> ObterAlunoLogadoAsync()
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(username))
            return null;

        var alunos = await _db.Alunos.AsNoTracking().ToListAsync();

        var aluno = alunos.FirstOrDefault(a =>
            string.Equals(a.Email, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.RA, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.Nome, username, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(GerarUsernameBasico(a.Nome), username, StringComparison.OrdinalIgnoreCase) ||
            username.StartsWith(GerarUsernameBasico(a.Nome), StringComparison.OrdinalIgnoreCase)
        );

        return aluno;
    }

    // ==========================
    // PROFESSOR: LISTAR ALUNOS + STATUS DO DIA
    // ==========================

    // GET /api/Presencas/professor?turma=1A&dataAula=2026-02-04
    [HttpGet("professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<IEnumerable<object>>> GetParaProfessor(
        [FromQuery] string? turma,
        [FromQuery] DateTime? dataAula)
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var disciplina = await ObterOuCriarDisciplinaAsync(professor.Disciplina);
        var dia = NormalizarDataUtc(dataAula ?? DateTime.UtcNow);

        var alunosQuery = _db.Alunos.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(turma))
        {
            var t = turma.Trim();
            alunosQuery = alunosQuery.Where(a => a.Turma == t);
        }

        var alunos = await alunosQuery.OrderBy(a => a.Nome).ToListAsync();

        var presencasDia = await _db.Presencas
            .AsNoTracking()
            .Where(p => p.ProfessorId == professor.Id &&
                        p.DisciplinaId == disciplina.Id &&
                        p.DataAula == dia)
            .ToListAsync();

        var idx = presencasDia.ToDictionary(p => p.AlunoId, p => p.Presente);

        var resultado = alunos.Select(a => new
        {
            alunoId = a.Id,
            nome = a.Nome,
            turma = a.Turma,
            presente = idx.TryGetValue(a.Id, out var pres) ? pres : (bool?)null
        });

        return Ok(resultado);
    }

    // ==========================
    // PROFESSOR: MARCAR PRESENÇA EM LOTE (UPSERT)
    // ==========================

    // POST /api/Presencas/marcar-lote
    [HttpPost("marcar-lote")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<object>> MarcarLote([FromBody] PresencaLoteDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var disciplina = await ObterOuCriarDisciplinaAsync(professor.Disciplina);
        var dia = NormalizarDataUtc(dto.DataAula);

        var alunoIds = dto.Itens.Select(i => i.AlunoId).Distinct().ToList();

        var alunosExistentes = await _db.Alunos
            .Where(a => alunoIds.Contains(a.Id))
            .Select(a => a.Id)
            .ToListAsync();

        var faltantes = alunoIds.Except(alunosExistentes).ToList();
        if (faltantes.Count > 0)
            return NotFound(new { message = "Alguns alunos não foram encontrados.", alunoIds = faltantes });

        var existentes = await _db.Presencas
            .Where(p => p.ProfessorId == professor.Id &&
                        p.DisciplinaId == disciplina.Id &&
                        p.DataAula == dia &&
                        alunoIds.Contains(p.AlunoId))
            .ToListAsync();

        var existentesIdx = existentes.ToDictionary(p => p.AlunoId, p => p);

        var criados = 0;
        var atualizados = 0;

        foreach (var item in dto.Itens)
        {
            if (existentesIdx.TryGetValue(item.AlunoId, out var presenca))
            {
                if (presenca.Presente != item.Presente)
                {
                    presenca.Presente = item.Presente;
                    presenca.AtualizadoEm = DateTime.UtcNow;
                    atualizados++;
                }
            }
            else
            {
                _db.Presencas.Add(new Presenca
                {
                    AlunoId = item.AlunoId,
                    ProfessorId = professor.Id,
                    DisciplinaId = disciplina.Id,
                    DataAula = dia,
                    Presente = item.Presente,
                    CriadoEm = DateTime.UtcNow
                });
                criados++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            dataAula = dia,
            turma = dto.Turma,
            criados,
            atualizados,
            total = dto.Itens.Count
        });
    }

    // ==========================
    // ALUNO: VER MINHAS FALTAS
    // ==========================

    // GET /api/Presencas/minhas-faltas?de=2026-01-01&ate=2026-02-04
    [HttpGet("minhas-faltas")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<ActionResult<object>> MinhasFaltas([FromQuery] DateTime? de, [FromQuery] DateTime? ate)
    {
        var aluno = await ObterAlunoLogadoAsync();
        if (aluno == null)
            return Unauthorized(new { message = "Não foi possível identificar o aluno logado." });

        DateTime? deUtc = de.HasValue ? NormalizarDataUtc(de.Value) : null;
        DateTime? ateUtc = ate.HasValue ? NormalizarDataUtc(ate.Value) : null;

        var query = _db.Presencas
            .AsNoTracking()
            .Include(p => p.Disciplina)
            .Include(p => p.Professor)
            .Where(p => p.AlunoId == aluno.Id && p.Presente == false);

        if (deUtc.HasValue)
            query = query.Where(p => p.DataAula >= deUtc.Value);

        if (ateUtc.HasValue)
            query = query.Where(p => p.DataAula <= ateUtc.Value);

        var faltas = await query
            .OrderByDescending(p => p.DataAula)
            .Select(p => new
            {
                dataAula = p.DataAula,
                disciplina = p.Disciplina != null ? p.Disciplina.Nome : "",
                professor = p.Professor != null ? p.Professor.Nome : ""
            })
            .ToListAsync();

        var porDisciplina = faltas
            .GroupBy(f => f.disciplina)
            .Select(g => new { disciplina = g.Key, faltas = g.Count() })
            .OrderByDescending(x => x.faltas)
            .ToList();

        return Ok(new
        {
            aluno = new { id = aluno.Id, nome = aluno.Nome, ra = aluno.RA, turma = aluno.Turma },
            totalFaltas = faltas.Count,
            faltasPorDisciplina = porDisciplina,
            faltas
        });
    }
}
