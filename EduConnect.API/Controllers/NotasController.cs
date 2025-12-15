using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;


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
                tipo = n.Tipo.ToString(),      // <- devolve Atividade/P1/P2
                valor = n.Valor,
                turma = n.Aluno!.Turma,
                disciplina = n.Disciplina!.Nome,
                data = n.DataLancamento
            };

        var resultado = await query.AsNoTracking().ToListAsync();
        return Ok(resultado);
    }

    // ==========================
    // LANÇAR / EDITAR NOTA (PROFESSOR)
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

        var aluno = await _db.Alunos.FindAsync(dto.AlunoId);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var disciplina = await ObterOuCriarDisciplinaAsync(professor.Disciplina);

        // Verifica se já existe nota desse tipo para esse aluno + professor + disciplina
        var nota = await _db.Notas.FirstOrDefaultAsync(n =>
            n.AlunoId == aluno.Id &&
            n.ProfessorId == professor.Id &&
            n.DisciplinaId == disciplina.Id &&
            n.Tipo == tipoAvaliacao.Value);

        if (nota == null)
        {
            // Cria nova (ainda não existe)
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
            // Atualiza a nota existente (permite editar)
            nota.Valor = dto.Valor;
            nota.DataLancamento = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var resposta = new
        {
            id = nota.Id,
            alunoId = nota.AlunoId,
            tipo = nota.Tipo.ToString(),
            valor = nota.Valor,
            turma = aluno.Turma,
            disciplina = disciplina.Nome,
            data = nota.DataLancamento
        };

        // não faz mais sentido CreatedAt, é um "upsert"
        return Ok(resposta);
    }

    // ==========================
    // REMOVER NOTA (PROFESSOR)
    // (continua permitindo deletar, se quiser)
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

    // GET: /api/Notas/grafico-admin?turma=1A
    [HttpGet("grafico-admin")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<IEnumerable<object>>> GraficoAdmin([FromQuery] string turma)
    {
        if (string.IsNullOrWhiteSpace(turma))
            return BadRequest(new { message = "Turma é obrigatória." });

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

    // ==========================
    // LISTA DE NOTAS – ALUNO (DETALHADO)
    // Matéria, Atividade, P1, P2, Média
    // ==========================

    // GET: /api/Notas/aluno-detalhes/{alunoId}
    [HttpGet("aluno-detalhes/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<IEnumerable<object>>> AlunoDetalhes(int alunoId)
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
            };

        var resultado = await query.AsNoTracking().ToListAsync();

        // arredondar (opcional, mas fica mais bonito no front)
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
    // BOLETIM (PDF) – ALUNO
    // ==========================
    // GET: /api/Notas/boletim/{alunoId}
    [HttpGet("boletim/{alunoId:int}")]
    [Authorize(Roles = $"{UserRoles.Aluno},{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> GerarBoletim(int alunoId)
    {
        // Se for ALUNO, só pode gerar o próprio boletim
        if (User.IsInRole(UserRoles.Aluno))
        {
            var username = User.FindFirstValue(ClaimTypes.Name);
            if (string.IsNullOrWhiteSpace(username))
                return Unauthorized(new { message = "Usuário não identificado no token." });

            // mesmo critério do /Alunos/me (pra amarrar usuário->aluno)
            static string GerarUsernameBasico(string nomeCompleto)
            {
                var partes = nomeCompleto.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var primeiraLetra = char.ToLowerInvariant(partes[0][0]);
                var ultimoSobrenome = partes.Length > 1 ? partes[^1].ToLowerInvariant() : partes[0].ToLowerInvariant();
                return $"{primeiraLetra}{ultimoSobrenome}";
            }

            var alunos = await _db.Alunos.AsNoTracking().ToListAsync();
            var alunoLogado = alunos.FirstOrDefault(a =>
                string.Equals(a.Email, username, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(a.RA, username, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(a.Nome, username, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(GerarUsernameBasico(a.Nome), username, StringComparison.OrdinalIgnoreCase) ||
                username.StartsWith(GerarUsernameBasico(a.Nome), StringComparison.OrdinalIgnoreCase)
            );

            if (alunoLogado == null)
                return Forbid();

            if (alunoLogado.Id != alunoId)
                return Forbid();
        }

        var aluno = await _db.Alunos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == alunoId);
        if (aluno == null)
            return NotFound(new { message = "Aluno não encontrado." });

        var medias =
            await (from n in _db.Notas.Include(x => x.Disciplina)
                   where n.AlunoId == alunoId
                   group n by n.Disciplina!.Nome into g
                   select new
                   {
                       Disciplina = g.Key,
                       Media = g.Average(x => x.Valor)
                   })
            .AsNoTracking()
            .ToListAsync();

        // ordena e calcula status
        var linhas = medias
            .OrderBy(x => x.Disciplina)
            .Select(x => new
            {
                x.Disciplina,
                Media = Math.Round(x.Media, 2),
                Status = x.Media >= 5.0m ? "Aprovado" : "Reprovado"
            })
            .ToList();

        var dataEmissao = DateTime.Now;

        // Gera PDF
        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(30);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header().Column(col =>
                {
                    col.Item().Text("Boletim Escolar - EduConnect").SemiBold().FontSize(18);
                    col.Item().Text($"Emissão: {dataEmissao:dd/MM/yyyy HH:mm}");
                    col.Item().LineHorizontal(1);
                });

                page.Content().Column(col =>
                {
                    col.Spacing(10);

                    col.Item().Text($"Nome: {aluno.Nome}").FontSize(12);
                    col.Item().Text($"RA: {aluno.RA}").FontSize(12);
                    col.Item().Text($"Turma: {aluno.Turma}").FontSize(12);

                    col.Item().LineHorizontal(1);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(6); // Disciplina
                            columns.RelativeColumn(2); // Média
                            columns.RelativeColumn(3); // Status
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellHeader).Text("Matéria");
                            header.Cell().Element(CellHeader).AlignCenter().Text("Média");
                            header.Cell().Element(CellHeader).AlignCenter().Text("Situação");
                        });

                        if (linhas.Count == 0)
                        {
                            table.Cell().ColumnSpan(3).PaddingVertical(10)
                                 .Text("Nenhuma nota lançada ainda.").Italic();
                        }
                        else
                        {
                            foreach (var l in linhas)
                            {
                                table.Cell().Element(CellBody).Text(l.Disciplina);
                                table.Cell().Element(CellBody).AlignCenter().Text(l.Media.ToString("0.00"));
                                table.Cell().Element(CellBody).AlignCenter().Text(l.Status);
                            }
                        }
                    });

                    col.Item().Text("Critério: aprovado com média >= 5,0.")
                              .FontSize(10).FontColor(Colors.Grey.Darken2);
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("EduConnect • Página ");
                    t.CurrentPageNumber();
                    t.Span(" de ");
                    t.TotalPages();
                });

                static IContainer CellHeader(IContainer c) =>
                    c.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(6).PaddingHorizontal(6).Background(Colors.Grey.Lighten3);

                static IContainer CellBody(IContainer c) =>
                    c.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(6).PaddingHorizontal(6);
            });
        }).GeneratePdf();

        var fileName = $"Boletim_{aluno.RA}_{dataEmissao:yyyyMMddHHmm}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

}
