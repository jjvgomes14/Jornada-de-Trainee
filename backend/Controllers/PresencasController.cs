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
    private readonly ILogger<PresencasController> _logger;

    public PresencasController(ApplicationDbContext db, ILogger<PresencasController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int? ObterUserIdDoToken()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var userId))
            return userId;

        return null;
    }

    private async Task<Professor?> ObterProfessorLogadoAsync()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
            return null;

        return await _db.Professores
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UsuarioId == userId.Value);
    }

    private async Task<Aluno?> ObterAlunoLogadoAsync()
    {
        var userId = ObterUserIdDoToken();
        if (userId == null)
            return null;

        return await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UsuarioId == userId.Value);
    }

    private static StatusPresenca? ConverterStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return null;

        var valor = status.Trim().ToUpperInvariant();

        return valor switch
        {
            "PRESENTE" => StatusPresenca.Presente,
            "FALTA" => StatusPresenca.Falta,
            _ => null
        };
    }

    [HttpGet("professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<IEnumerable<object>>> GetPresencasProfessor([FromQuery] DateTime? dataAula)
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var dataFiltro = (dataAula ?? DateTime.Today).Date;

        var alunos = await _db.Alunos
            .AsNoTracking()
            .OrderBy(a => a.Turma)
            .ThenBy(a => a.Nome)
            .Select(a => new
            {
                id = a.Id,
                nome = a.Nome,
                ra = a.RA,
                turma = a.Turma
            })
            .ToListAsync();

        var presencas = await _db.Presencas
            .AsNoTracking()
            .Where(p => p.ProfessorId == professor.Id && p.DataAula.Date == dataFiltro)
            .ToListAsync();

        var resposta = alunos.Select(aluno =>
        {
            var registro = presencas
                .Where(p => p.AlunoId == aluno.id)
                .OrderByDescending(p => p.Id)
                .FirstOrDefault();

            return new
            {
                alunoId = aluno.id,
                alunoNome = aluno.nome,
                ra = aluno.ra,
                turma = aluno.turma,
                professorId = professor.Id,
                professorNome = professor.Nome,
                disciplina = professor.Disciplina,
                dataAula = dataFiltro,
                aula = registro?.Aula ?? string.Empty,
                status = registro?.Status.ToString() ?? string.Empty
            };
        });

        return Ok(resposta);
    }

    [HttpPost("registrar")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<object>> Registrar([FromBody] RegistrarPresencaDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (dto.AlunoId <= 0)
            return BadRequest(new { message = "AlunoId inválido." });

        var status = ConverterStatus(dto.Status);
        if (status == null)
            return BadRequest(new { message = "Status inválido. Use Presente ou Falta." });

        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var aluno = await _db.Alunos.FirstOrDefaultAsync(a => a.Id == dto.AlunoId);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var aulaNormalizada = (dto.Aula ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(aulaNormalizada))
            return BadRequest(new { message = "Informe a aula." });

        var dataAula = dto.DataAula.Date;
        var disciplina = (professor.Disciplina ?? string.Empty).Trim();

        try
        {
            var presenca = await _db.Presencas.FirstOrDefaultAsync(p =>
                p.AlunoId == dto.AlunoId &&
                p.ProfessorId == professor.Id &&
                p.DataAula == dataAula &&
                p.Aula.ToLower() == aulaNormalizada.ToLower());

            if (presenca == null)
            {
                presenca = new Presenca
                {
                    AlunoId = aluno.Id,
                    ProfessorId = professor.Id,
                    DataAula = dataAula,
                    Aula = aulaNormalizada,
                    Disciplina = disciplina,
                    Status = status.Value
                };

                _db.Presencas.Add(presenca);
            }
            else
            {
                presenca.Status = status.Value;
                presenca.Disciplina = disciplina;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = presenca.Id,
                alunoId = aluno.Id,
                alunoNome = aluno.Nome,
                turma = aluno.Turma,
                professorId = professor.Id,
                professorNome = professor.Nome,
                disciplina = presenca.Disciplina,
                dataAula = presenca.DataAula,
                aula = presenca.Aula,
                status = presenca.Status.ToString()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao registrar presença. AlunoId={AlunoId}, ProfessorId={ProfessorId}", dto.AlunoId, professor.Id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro ao registrar a presença." });
        }
    }

    [HttpGet("aluno")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<ActionResult<IEnumerable<object>>> GetFaltasAluno()
    {
        var aluno = await ObterAlunoLogadoAsync();
        if (aluno == null)
            return Forbid();

        var faltas = await _db.Presencas
            .AsNoTracking()
            .Include(p => p.Professor)
            .Where(p => p.AlunoId == aluno.Id && p.Status == StatusPresenca.Falta)
            .OrderByDescending(p => p.DataAula)
            .ThenByDescending(p => p.Id)
            .Select(p => new
            {
                id = p.Id,
                alunoId = p.AlunoId,
                alunoNome = aluno.Nome,
                turma = aluno.Turma,
                dataAula = p.DataAula,
                aula = p.Aula,
                disciplina = p.Disciplina,
                professorId = p.ProfessorId,
                professorNome = p.Professor != null ? p.Professor.Nome : string.Empty,
                status = p.Status.ToString()
            })
            .ToListAsync();

        return Ok(faltas);
    }
}