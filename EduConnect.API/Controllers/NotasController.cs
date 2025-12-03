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
public class NotasController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public NotasController(ApplicationDbContext db)
    {
        _db = db;
    }

    private int? GetUserId()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var id))
            return id;
        return null;
    }

    private async Task<Professor?> GetProfessorLogadoAsync()
    {
        var userId = GetUserId();
        if (userId == null) return null;

        return await _db.Professores
            .FirstOrDefaultAsync(p => p.UsuarioId == userId.Value);
    }

    // Todas as notas do professor logado (usado na aba Notas)
    [HttpGet("professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult> GetNotasProfessor()
    {
        var prof = await GetProfessorLogadoAsync();

        // Se o professor logado ainda não estiver vinculado a um cadastro de Professor
        // (por exemplo, base de dados antiga), ao invés de retornar 403 (Forbid)
        // devolvemos uma lista vazia para não quebrar o carregamento inicial do dashboard.
        if (prof == null) return Ok(new object[0]);

        var query =
            from n in _db.Notas
            join a in _db.Alunos on n.AlunoId equals a.Id
            join d in _db.Disciplinas on n.DisciplinaId equals d.Id
            where n.ProfessorId == prof.Id
            orderby a.Turma, a.Nome
            select new
            {
                n.Id,
                n.Valor,
                n.DataLancamento,
                alunoId = a.Id,
                alunoNome = a.Nome,
                a.RA,
                a.Turma,
                disciplina = d.Nome
            };

        var lista = await query.AsNoTracking().ToListAsync();
        return Ok(lista);
    }


    // Professor lança nota para um aluno (sempre da disciplina dele)
    // Professor lança nota para um aluno (sempre da disciplina dele)
    [HttpPost]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult> LancarNota([FromBody] NotaCreateDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Dados da nota não enviados." });

        if (dto.Valor < 0 || dto.Valor > 10)
            return BadRequest(new { message = "A nota deve estar entre 0 e 10." });

        var prof = await GetProfessorLogadoAsync();
        if (prof == null)
        {
            // em vez de Forbid genérico, devolve mensagem clara
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Professor logado não está vinculado a um cadastro de professor (UsuarioId nulo)." });
        }

        var aluno = await _db.Alunos.FindAsync(dto.AlunoId);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        if (string.IsNullOrWhiteSpace(prof.Disciplina))
        {
            return BadRequest(new
            {
                message = "A disciplina do professor não está definida. Edite o cadastro do professor e informe a disciplina."
            });
        }

        var nomeDisciplina = prof.Disciplina.Trim();

        var disciplina = await _db.Disciplinas
            .FirstOrDefaultAsync(d => d.Nome == nomeDisciplina);

        if (disciplina == null)
        {
            disciplina = new Disciplina { Nome = nomeDisciplina };
            _db.Disciplinas.Add(disciplina);

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Erro ao criar disciplina no banco de dados.", detalhe = ex.Message });
            }
        }

        var nota = new Nota
        {
            AlunoId = aluno.Id,
            ProfessorId = prof.Id,
            DisciplinaId = disciplina.Id,
            Valor = dto.Valor,
            DataLancamento = DateTime.UtcNow
        };

        _db.Notas.Add(nota);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "Erro ao salvar nota no banco de dados.", detalhe = ex.Message });
        }

        return CreatedAtAction(nameof(GetNotasProfessor), new { id = nota.Id }, new
        {
            nota.Id,
            nota.Valor,
            nota.DataLancamento,
            alunoId = aluno.Id,
            alunoNome = aluno.Nome,
            aluno.RA,
            aluno.Turma,
            disciplina = disciplina.Nome
        });
    }


    // Professor só apaga notas dele
    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<IActionResult> RemoverNota(int id)
    {
        var prof = await GetProfessorLogadoAsync();
        if (prof == null) return Forbid();

        var nota = await _db.Notas
            .FirstOrDefaultAsync(n => n.Id == id && n.ProfessorId == prof.Id);

        if (nota == null) return NotFound();

        _db.Notas.Remove(nota);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Gráfico do professor: média por turma (apenas disciplina dele)
    [HttpGet("grafico-professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult> GraficoProfessor()
    {
        var prof = await GetProfessorLogadoAsync();
        if (prof == null) return Forbid();

        var query =
            from n in _db.Notas
            join a in _db.Alunos on n.AlunoId equals a.Id
            where n.ProfessorId == prof.Id
            group n by a.Turma into g
            select new
            {
                turma = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.ToListAsync();
        return Ok(resultado);
    }

    // Gráfico do admin: para uma turma, média em TODAS as disciplinas (colunas)
    [HttpGet("grafico-admin")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult> GraficoAdmin([FromQuery] string turma)
    {
        if (string.IsNullOrWhiteSpace(turma))
            return BadRequest(new { message = "Informe a turma." });

        var query =
            from n in _db.Notas
            join a in _db.Alunos on n.AlunoId equals a.Id
            join d in _db.Disciplinas on n.DisciplinaId equals d.Id
            where a.Turma == turma
            group n by d.Nome into g
            select new
            {
                disciplina = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.ToListAsync();
        return Ok(resultado);
    }

    // Opcional: gráfico por aluno (se quiser usar no futuro)
    [HttpGet("grafico-aluno/{alunoId:int}")]
    [Authorize]
    public async Task<ActionResult> GraficoAluno(int alunoId)
    {
        if (!await _db.Alunos.AnyAsync(a => a.Id == alunoId))
            return NotFound();

        var query =
            from n in _db.Notas
            join d in _db.Disciplinas on n.DisciplinaId equals d.Id
            where n.AlunoId == alunoId
            group n by d.Nome into g
            select new
            {
                disciplina = g.Key,
                media = g.Average(x => x.Valor)
            };

        var resultado = await query.ToListAsync();
        return Ok(resultado);
    }
}
