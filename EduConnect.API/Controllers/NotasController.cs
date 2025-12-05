using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotasController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public NotasController(ApplicationDbContext db)
    {
        _db = db;
    }

    // ==========================
    // HELPERS PRIVADOS
    // ==========================

    /// <summary>
    /// Retorna o professor vinculado ao usuário logado (ou null).
    /// Usa a claim "userId" do token para achar Professor.UsuarioId.
    /// </summary>
    private async Task<Professor?> ObterProfessorLogadoAsync()
    {
        var userIdStr = User.FindFirst("userId")?.Value;
        if (!int.TryParse(userIdStr, out var userId))
            return null;

        return await _db.Professores
            .FirstOrDefaultAsync(p => p.UsuarioId == userId);
    }

    /// <summary>
    /// Garante que exista uma entidade Disciplina com o nome informado.
    /// Se não existir, cria.
    /// </summary>
    private async Task<Disciplina> ObterOuCriarDisciplinaAsync(string nome)
    {
        var nomeNormalizado = nome.Trim();

        var disciplina = await _db.Disciplinas
            .FirstOrDefaultAsync(d => d.Nome == nomeNormalizado);

        if (disciplina != null)
            return disciplina;

        disciplina = new Disciplina { Nome = nomeNormalizado };
        _db.Disciplinas.Add(disciplina);
        await _db.SaveChangesAsync();

        return disciplina;
    }

    // ==========================
    // NOTAS DO PROFESSOR (LISTA)
    // ==========================

    // GET: /api/Notas/professor
    [HttpGet("professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<IEnumerable<object>>> GetNotasProfessor()
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var query =
            from n in _db.Notas
                .Include(x => x.Aluno)
                .Include(x => x.Disciplina)
            where n.ProfessorId == professor.Id
            orderby n.DataLancamento descending
            select new
            {
                id = n.Id,
                alunoId = n.AlunoId,
                valor = n.Valor,
                turma = n.Aluno!.Turma,
                disciplina = n.Disciplina!.Nome,
                data = n.DataLancamento
            };

        var resultado = await query.AsNoTracking().ToListAsync();
        return Ok(resultado);
    }

    // ==========================
    // LANÇAR NOTA (PROFESSOR)
    // ==========================

    // POST: /api/Notas
    [HttpPost]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<object>> Create([FromBody] NotaCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (dto.AlunoId <= 0)
            return BadRequest(new { message = "AlunoId inválido." });

        if (dto.Valor < 0 || dto.Valor > 10)
            return BadRequest(new { message = "A nota deve estar entre 0 e 10." });

        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var aluno = await _db.Alunos.FindAsync(dto.AlunoId);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var disciplina = await ObterOuCriarDisciplinaAsync(professor.Disciplina);

        var nota = new Nota
        {
            AlunoId = aluno.Id,
            ProfessorId = professor.Id,
            DisciplinaId = disciplina.Id,
            Valor = dto.Valor,
            DataLancamento = DateTime.UtcNow
        };

        _db.Notas.Add(nota);
        await _db.SaveChangesAsync();

        var resposta = new
        {
            id = nota.Id,
            alunoId = nota.AlunoId,
            valor = nota.Valor,
            turma = aluno.Turma,
            disciplina = disciplina.Nome,
            data = nota.DataLancamento
        };

        return CreatedAtAction(nameof(GetNotasProfessor), new { }, resposta);
    }

    // ==========================
    // REMOVER NOTA (PROFESSOR)
    // ==========================

    // DELETE: /api/Notas/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<IActionResult> Delete(int id)
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var nota = await _db.Notas.FindAsync(id);
        if (nota == null)
            return NotFound();

        if (nota.ProfessorId != professor.Id)
            return Forbid(); // professor só apaga nota dele

        _db.Notas.Remove(nota);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ==========================
    // GRÁFICO – PROFESSOR
    // ==========================

    // GET: /api/Notas/grafico-professor
    [HttpGet("grafico-professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<IEnumerable<object>>> GraficoProfessor()
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var query =
            from n in _db.Notas
                .Include(x => x.Aluno)
            where n.ProfessorId == professor.Id
            group n by n.Aluno!.Turma into g
            select new
            {
                turma = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.AsNoTracking().ToListAsync();
        return Ok(resultado);
    }

    // ==========================
    // GRÁFICO – ADMIN (POR TURMA)
    // ==========================

    // GET: /api/Notas/grafico-admin?turma=3ºB
    [HttpGet("grafico-admin")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<IEnumerable<object>>> GraficoAdmin([FromQuery] string turma)
    {
        if (string.IsNullOrWhiteSpace(turma))
            return BadRequest(new { message = "Informe a turma." });

        var turmaNormalizada = turma.Trim();

        var query =
            from n in _db.Notas
                .Include(x => x.Aluno)
                .Include(x => x.Disciplina)
            where n.Aluno!.Turma == turmaNormalizada
            group n by n.Disciplina!.Nome into g
            select new
            {
                disciplina = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.AsNoTracking().ToListAsync();
        return Ok(resultado);
    }

    // ==========================
    // GRÁFICO – ALUNO ESPECÍFICO
    // ==========================

    // GET: /api/Notas/grafico-aluno/{alunoId}
    [HttpGet("grafico-aluno/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<IEnumerable<object>>> GraficoAluno(int alunoId)
    {
        var existeAluno = await _db.Alunos.AnyAsync(a => a.Id == alunoId);
        if (!existeAluno)
            return NotFound(new { message = "Aluno não encontrado." });

        var query =
            from n in _db.Notas
                .Include(x => x.Disciplina)
            where n.AlunoId == alunoId
            group n by n.Disciplina!.Nome into g
            select new
            {
                disciplina = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.AsNoTracking().ToListAsync();
        return Ok(resultado);
    }
}
