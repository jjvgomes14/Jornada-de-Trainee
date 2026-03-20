using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotasController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NotasController> _logger;

    public NotasController(ApplicationDbContext db, ILogger<NotasController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private sealed class BoletimDisciplinaResumo
    {
        public string Disciplina { get; set; } = string.Empty;
        public string Professor { get; set; } = string.Empty;
        public decimal? Atividade { get; set; }
        public decimal? P1 { get; set; }
        public decimal? P2 { get; set; }
        public decimal Media { get; set; }
        public decimal PresencaPercentual { get; set; }
        public string Situacao { get; set; } = string.Empty;
    }

    // ==========================
    // HELPERS PRIVADOS
    // ==========================

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

    private async Task<bool> ProfessorPodeAcessarAlunoAsync(int professorId, int alunoId)
    {
        return await _db.Notas.AnyAsync(n =>
            n.ProfessorId == professorId &&
            n.AlunoId == alunoId);
    }

    private async Task<bool> UsuarioPodeAcessarAlunoAsync(int alunoId)
    {
        if (User.IsInRole(UserRoles.Administrador))
            return true;

        if (User.IsInRole(UserRoles.Aluno))
        {
            var alunoLogado = await ObterAlunoLogadoAsync();
            return alunoLogado != null && alunoLogado.Id == alunoId;
        }

        if (User.IsInRole(UserRoles.Professor))
        {
            var professor = await ObterProfessorLogadoAsync();
            if (professor == null)
                return false;

            return await ProfessorPodeAcessarAlunoAsync(professor.Id, alunoId);
        }

        return false;
    }

    private async Task<Disciplina> ObterOuCriarDisciplinaAsync(string nome)
    {
        var nomeNormalizado = (nome ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(nomeNormalizado))
            throw new InvalidOperationException("O professor logado não possui disciplina válida cadastrada.");

        var disciplina = await _db.Disciplinas
            .FirstOrDefaultAsync(d => d.Nome.ToLower() == nomeNormalizado.ToLower());

        if (disciplina != null)
            return disciplina;

        disciplina = new Disciplina
        {
            Nome = nomeNormalizado
        };

        _db.Disciplinas.Add(disciplina);
        await _db.SaveChangesAsync();

        return disciplina;
    }

    private static TipoAvaliacao? ConverterTipo(string? tipo)
    {
        if (string.IsNullOrWhiteSpace(tipo))
            return null;

        var t = tipo.Trim().ToUpperInvariant();

        return t switch
        {
            "ATIVIDADE" => TipoAvaliacao.Atividade,
            "P1" => TipoAvaliacao.P1,
            "P2" => TipoAvaliacao.P2,
            _ => null
        };
    }

    private static decimal CalcularPercentualPresenca(IEnumerable<Presenca> presencasDisciplina)
    {
        var lista = presencasDisciplina.ToList();
        var totalAulas = lista.Count;

        if (totalAulas == 0)
            return 0m;

        var totalPresencas = lista.Count(p => p.Status == StatusPresenca.Presente);
        var percentual = (decimal)totalPresencas * 100m / totalAulas;

        return Math.Round(percentual, 2);
    }

    private static string CalcularSituacao(decimal media, decimal percentualPresenca)
    {
        return media >= 5m && percentualPresenca >= 75m
            ? "Aprovado"
            : "Reprovado";
    }

    // ==========================
    // NOTAS DO PROFESSOR
    // ==========================

    // GET: /api/Notas/professor
    [HttpGet("professor")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<ActionResult<IEnumerable<object>>> GetNotasProfessor()
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var resultado = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Aluno)
            .Include(n => n.Disciplina)
            .Where(n => n.ProfessorId == professor.Id)
            .OrderByDescending(n => n.DataLancamento)
            .Select(n => new
            {
                id = n.Id,
                alunoId = n.AlunoId,
                alunoNome = n.Aluno != null ? n.Aluno.Nome : string.Empty,
                tipo = n.Tipo.ToString(),
                valor = n.Valor,
                turma = n.Aluno != null ? n.Aluno.Turma : string.Empty,
                disciplina = n.Disciplina != null ? n.Disciplina.Nome : string.Empty,
                data = n.DataLancamento
            })
            .ToListAsync();

        return Ok(resultado);
    }

    // ==========================
    // CRIAR / EDITAR NOTA
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

        var tipoAvaliacao = ConverterTipo(dto.Tipo);
        if (tipoAvaliacao == null)
        {
            return BadRequest(new
            {
                message = "Tipo de avaliação inválido. Use: Atividade, P1 ou P2."
            });
        }

        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var aluno = await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == dto.AlunoId);

        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        try
        {
            var disciplina = await ObterOuCriarDisciplinaAsync(professor.Disciplina);

            var nota = await _db.Notas.FirstOrDefaultAsync(n =>
                n.AlunoId == aluno.Id &&
                n.ProfessorId == professor.Id &&
                n.DisciplinaId == disciplina.Id &&
                n.Tipo == tipoAvaliacao.Value);

            if (nota == null)
            {
                nota = new Nota
                {
                    AlunoId = aluno.Id,
                    ProfessorId = professor.Id,
                    DisciplinaId = disciplina.Id,
                    Tipo = tipoAvaliacao.Value,
                    Valor = dto.Valor,
                    DataLancamento = DateTime.UtcNow
                };

                _db.Notas.Add(nota);
            }
            else
            {
                nota.Valor = dto.Valor;
                nota.DataLancamento = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            var resposta = new
            {
                id = nota.Id,
                alunoId = nota.AlunoId,
                alunoNome = aluno.Nome,
                tipo = nota.Tipo.ToString(),
                valor = nota.Valor,
                turma = aluno.Turma,
                disciplina = disciplina.Nome,
                data = nota.DataLancamento
            };

            return Ok(resposta);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao lançar/atualizar nota para AlunoId={AlunoId}", dto.AlunoId);

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Ocorreu um erro ao salvar a nota."
            });
        }
    }

    // ==========================
    // EXCLUIR NOTA
    // ==========================

    // DELETE: /api/Notas/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = UserRoles.Professor)]
    public async Task<IActionResult> Delete(int id)
    {
        var professor = await ObterProfessorLogadoAsync();
        if (professor == null)
            return Forbid();

        var nota = await _db.Notas.FirstOrDefaultAsync(n => n.Id == id);
        if (nota == null)
            return NotFound(new { message = "Nota não encontrada." });

        if (nota.ProfessorId != professor.Id)
            return Forbid();

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

        var resultado = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Aluno)
            .Where(n => n.ProfessorId == professor.Id)
            .GroupBy(n => n.Aluno != null ? n.Aluno.Turma : string.Empty)
            .Select(g => new
            {
                turma = g.Key,
                media = g.Average(x => x.Valor)
            })
            .ToListAsync();

        return Ok(resultado);
    }

    // ==========================
    // GRÁFICO – ADMIN
    // ==========================

    // GET: /api/Notas/grafico-admin
    [HttpGet("grafico-admin")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<IEnumerable<object>>> GraficoAdmin()
    {
        var resultado = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Aluno)
            .Include(n => n.Disciplina)
            .Where(n => n.Aluno != null &&
                        !string.IsNullOrWhiteSpace(n.Aluno.Turma) &&
                        n.Disciplina != null &&
                        !string.IsNullOrWhiteSpace(n.Disciplina.Nome))
            .GroupBy(n => new
            {
                Turma = n.Aluno!.Turma,
                Disciplina = n.Disciplina!.Nome
            })
            .Select(g => new
            {
                turma = g.Key.Turma,
                disciplina = g.Key.Disciplina,
                media = g.Average(x => x.Valor)
            })
            .OrderBy(x => x.disciplina)
            .ThenBy(x => x.turma)
            .ToListAsync();

        return Ok(resultado);
    }

    // ==========================
    // GRÁFICO – ALUNO
    // ==========================

    // GET: /api/Notas/grafico-aluno/{alunoId}
    [HttpGet("grafico-aluno/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<IEnumerable<object>>> GraficoAluno(int alunoId)
    {
        var podeAcessar = await UsuarioPodeAcessarAlunoAsync(alunoId);
        if (!podeAcessar)
            return Forbid();

        var existeAluno = await _db.Alunos.AnyAsync(a => a.Id == alunoId);
        if (!existeAluno)
            return NotFound(new { message = "Aluno não encontrado." });

        var resultado = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Disciplina)
            .Where(n => n.AlunoId == alunoId)
            .GroupBy(n => n.Disciplina != null ? n.Disciplina.Nome : string.Empty)
            .Select(g => new
            {
                disciplina = g.Key,
                media = g.Average(x => x.Valor)
            })
            .ToListAsync();

        return Ok(resultado);
    }

    // ==========================
    // DETALHES DO ALUNO
    // ==========================

    // GET: /api/Notas/aluno-detalhes/{alunoId}
    [HttpGet("aluno-detalhes/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<IEnumerable<object>>> AlunoDetalhes(int alunoId)
    {
        var podeAcessar = await UsuarioPodeAcessarAlunoAsync(alunoId);
        if (!podeAcessar)
            return Forbid();

        var existeAluno = await _db.Alunos.AnyAsync(a => a.Id == alunoId);
        if (!existeAluno)
            return NotFound(new { message = "Aluno não encontrado." });

        var resultado = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Disciplina)
            .Where(n => n.AlunoId == alunoId)
            .GroupBy(n => n.Disciplina != null ? n.Disciplina.Nome : string.Empty)
            .Select(g => new
            {
                disciplina = g.Key,
                atividade = g.Where(x => x.Tipo == TipoAvaliacao.Atividade)
                    .Select(x => (decimal?)x.Valor)
                    .FirstOrDefault(),
                p1 = g.Where(x => x.Tipo == TipoAvaliacao.P1)
                    .Select(x => (decimal?)x.Valor)
                    .FirstOrDefault(),
                p2 = g.Where(x => x.Tipo == TipoAvaliacao.P2)
                    .Select(x => (decimal?)x.Valor)
                    .FirstOrDefault(),
                media = (decimal?)g.Average(x => x.Valor)
            })
            .ToListAsync();

        var formatado = resultado.Select(x => new
        {
            x.disciplina,
            x.atividade,
            x.p1,
            x.p2,
            media = x.media.HasValue ? Math.Round(x.media.Value, 2) : (decimal?)null
        });

        return Ok(formatado);
    }

    // ==========================
    // PDF DO ALUNO
    // ==========================

    // GET: /api/Notas/boletim/{alunoId}
    [HttpGet("boletim/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> GerarBoletim(int alunoId)
    {
        var podeAcessar = await UsuarioPodeAcessarAlunoAsync(alunoId);
        if (!podeAcessar)
            return Forbid();

        var aluno = await _db.Alunos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == alunoId);

        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var notas = await _db.Notas
            .AsNoTracking()
            .Include(n => n.Disciplina)
            .Include(n => n.Professor)
            .Where(n => n.AlunoId == alunoId)
            .OrderBy(n => n.Disciplina != null ? n.Disciplina.Nome : string.Empty)
            .ThenBy(n => n.Tipo)
            .ToListAsync();

        var presencas = await _db.Presencas
            .AsNoTracking()
            .Include(p => p.Professor)
            .Where(p => p.AlunoId == alunoId)
            .OrderBy(p => p.Disciplina)
            .ThenBy(p => p.DataAula)
            .ToListAsync();

        var disciplinasNotas = notas
            .Select(n => n.Disciplina?.Nome ?? string.Empty)
            .Where(x => !string.IsNullOrWhiteSpace(x));

        var disciplinasPresencas = presencas
            .Select(p => p.Disciplina ?? string.Empty)
            .Where(x => !string.IsNullOrWhiteSpace(x));

        var todasDisciplinas = disciplinasNotas
            .Concat(disciplinasPresencas)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();

        var resumoDisciplinas = new List<BoletimDisciplinaResumo>();

        foreach (var disciplinaNome in todasDisciplinas)
        {
            var notasDisciplina = notas
                .Where(n => string.Equals(n.Disciplina?.Nome, disciplinaNome, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var presencasDisciplina = presencas
                .Where(p => string.Equals(p.Disciplina, disciplinaNome, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var atividade = notasDisciplina
                .Where(n => n.Tipo == TipoAvaliacao.Atividade)
                .Select(n => (decimal?)n.Valor)
                .FirstOrDefault();

            var p1 = notasDisciplina
                .Where(n => n.Tipo == TipoAvaliacao.P1)
                .Select(n => (decimal?)n.Valor)
                .FirstOrDefault();

            var p2 = notasDisciplina
                .Where(n => n.Tipo == TipoAvaliacao.P2)
                .Select(n => (decimal?)n.Valor)
                .FirstOrDefault();

            var media = notasDisciplina.Count > 0
                ? Math.Round(notasDisciplina.Average(n => n.Valor), 2)
                : 0m;

            var professorNomeNota = notasDisciplina
                .Select(n => n.Professor?.Nome)
                .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

            var professorNomePresenca = presencasDisciplina
                .Select(p => p.Professor?.Nome)
                .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

            var professorNome = professorNomeNota
                ?? professorNomePresenca
                ?? "-";

            var percentualPresenca = CalcularPercentualPresenca(presencasDisciplina);
            var situacao = CalcularSituacao(media, percentualPresenca);

            resumoDisciplinas.Add(new BoletimDisciplinaResumo
            {
                Disciplina = disciplinaNome,
                Professor = professorNome,
                Atividade = atividade,
                P1 = p1,
                P2 = p2,
                Media = media,
                PresencaPercentual = percentualPresenca,
                Situacao = situacao
            });
        }

        var mediaGeral = resumoDisciplinas.Count > 0
            ? Math.Round(resumoDisciplinas.Average(x => x.Media), 2)
            : 0m;

        var presencaGeral = resumoDisciplinas.Count > 0
            ? Math.Round(resumoDisciplinas.Average(x => x.PresencaPercentual), 2)
            : 0m;

        var situacaoGeral = resumoDisciplinas.Count > 0 &&
                            resumoDisciplinas.All(x => x.Situacao == "Aprovado")
            ? "Aprovado"
            : "Reprovado";

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(24);

                page.Header().Column(header =>
                {
                    header.Spacing(6);

                    header.Item().Text("Boletim Escolar")
                        .SemiBold()
                        .FontSize(20)
                        .FontColor(Colors.Blue.Medium);

                    header.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().Column(column =>
                {
                    column.Spacing(12);

                    column.Item().Text("Dados do Aluno")
                        .SemiBold()
                        .FontSize(14)
                        .FontColor(Colors.Grey.Darken2);

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(4);
                        });

                        void AddLinha(string titulo, string valor)
                        {
                            table.Cell().Element(CellHeaderInfo).Text(titulo);
                            table.Cell().Element(CellBodyInfo).Text(valor);
                        }

                        AddLinha("Nome", aluno.Nome);
                        AddLinha("RA", aluno.RA);
                        AddLinha("Turma", aluno.Turma);
                        AddLinha("Curso", aluno.Curso);
                        AddLinha("Email", aluno.Email);
                        AddLinha("Data de nascimento", aluno.DataNascimento.ToString("dd/MM/yyyy"));

                        static IContainer CellHeaderInfo(IContainer container) =>
                            container.Padding(6)
                                .Background(Colors.Grey.Lighten3)
                                .BorderBottom(1)
                                .BorderColor(Colors.Grey.Lighten1);

                        static IContainer CellBodyInfo(IContainer container) =>
                            container.Padding(6)
                                .BorderBottom(1)
                                .BorderColor(Colors.Grey.Lighten3);
                    });

                    column.Item().PaddingTop(8).Text("Resumo por Disciplina")
                        .SemiBold()
                        .FontSize(14)
                        .FontColor(Colors.Grey.Darken2);

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2.2f); // Disciplina
                            columns.RelativeColumn(1.1f); // Média
                            columns.RelativeColumn(1.2f); // Presença
                            columns.RelativeColumn(1.3f); // Situação
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellHeader).Text("Disciplina");
                            header.Cell().Element(CellHeader).AlignCenter().Text("Média");
                            header.Cell().Element(CellHeader).AlignCenter().Text("Presença");
                            header.Cell().Element(CellHeader).AlignCenter().Text("Situação");
                        });

                        if (resumoDisciplinas.Count == 0)
                        {
                            table.Cell().ColumnSpan(8).Element(CellBody).Text("Nenhum dado encontrado para este aluno.");
                        }
                        else
                        {
                            foreach (var item in resumoDisciplinas)
                            {
                                table.Cell().Element(CellBody).Text(item.Disciplina);
                                table.Cell().Element(CellBody).AlignCenter().Text(item.Media.ToString("0.00"));
                                table.Cell().Element(CellBody).AlignCenter().Text($"{item.PresencaPercentual:0.00}%");

                                table.Cell().Element(item.Situacao == "Aprovado" ? CellBodyAprovado : CellBodyReprovado)
                                    .AlignCenter()
                                    .Text(item.Situacao);
                            }
                        }

                        static IContainer CellHeader(IContainer container) =>
                            container.Padding(5)
                                .Background(Colors.Blue.Lighten4)
                                .Border(1)
                                .BorderColor(Colors.Grey.Lighten2);

                        static IContainer CellBody(IContainer container) =>
                            container.Padding(5)
                                .BorderBottom(1)
                                .BorderColor(Colors.Grey.Lighten3);

                        static IContainer CellBodyAprovado(IContainer container) =>
                            container.Padding(5)
                                .Background(Colors.Green.Lighten4)
                                .BorderBottom(1)
                                .BorderColor(Colors.Grey.Lighten3);

                        static IContainer CellBodyReprovado(IContainer container) =>
                            container.Padding(5)
                                .Background(Colors.Red.Lighten4)
                                .BorderBottom(1)
                                .BorderColor(Colors.Grey.Lighten3);
                    });

                   

                    column.Item().PaddingTop(6).Text("Critérios de aprovação: média maior ou igual a 5,00 e presença maior ou igual a 75,00%.")
                        .FontSize(10)
                        .FontColor(Colors.Grey.Darken1);
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("EduConnect • ");
                    text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm"));
                });
            });
        }).GeneratePdf();

        return File(pdf, "application/pdf", $"boletim-aluno-{alunoId}.pdf");
    }
}