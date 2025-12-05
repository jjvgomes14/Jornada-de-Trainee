// MatriculasController.cs
using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatriculasController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly EmailService _email;

    public MatriculasController(ApplicationDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    // =========================
    // 1) SOLICITAR MATRÍCULA
    // =========================
    // POST: /api/Matriculas/solicitar
    // Qualquer pessoa (sem login) pode solicitar matrícula
    [HttpPost("solicitar")]
    [AllowAnonymous]
    public async Task<IActionResult> Solicitar([FromBody] MatriculaSolicitacaoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var solicitacao = new SolicitacaoMatricula
        {
            Nome = dto.Nome.Trim(),
            Email = dto.Email.Trim(),
            DataNascimento = dto.DataNascimento.Date,
            CriadoEm = DateTime.UtcNow,
            Status = StatusMatricula.Pendente
        };

        _db.SolicitacoesMatricula.Add(solicitacao);
        await _db.SaveChangesAsync();

        // Tenta enviar e-mail de confirmação, mas não falha a requisição se der erro
        try
        {
            var assunto = "Solicitação de matrícula recebida – EduConnect";
            var mensagem =
                $"Olá {solicitacao.Nome},\n\n" +
                "Recebemos sua solicitação de matrícula.\n" +
                "Nossa equipe irá analisar os dados e, em breve, retornaremos por e-mail.\n\n" +
                "Atenciosamente,\nPortal EduConnect";

            await _email.EnviarAsync(solicitacao.Email, assunto, mensagem);
        }
        catch
        {
            // aqui você poderia logar o erro se tiver um logger configurado
        }

        return Ok(new { message = "Solicitação registrada com sucesso." });
    }

    // =========================
    // 2) LISTAR PENDENTES (ADMIN)
    // =========================
    // GET: /api/Matriculas/pendentes
    [HttpGet("pendentes")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<IEnumerable<object>>> GetPendentes()
    {
        var pendentes = await _db.SolicitacoesMatricula
            .AsNoTracking()
            .Where(s => s.Status == StatusMatricula.Pendente)
            .OrderByDescending(s => s.CriadoEm)
            .ToListAsync();

        // Projeta para um formato simples, com nomes que casam bem com o front
        var resultado = pendentes.Select(s => new
        {
            s.Id,
            s.Nome,
            s.Email,
            dataNascimento = s.DataNascimento,
            dataCriacao = s.CriadoEm,
            status = s.Status.ToString(),
            s.Observacao
        });

        return Ok(resultado);
    }

    // =========================
    // 3) RESPONDER MATRÍCULA (ADMIN)
    // =========================
    // POST: /api/Matriculas/responder
    [HttpPost("responder")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Responder([FromBody] MatriculaRespostaDto dto)
    {
        if (dto.Id <= 0)
            return BadRequest(new { message = "Id da solicitação inválido." });

        var solicitacao = await _db.SolicitacoesMatricula.FindAsync(dto.Id);
        if (solicitacao == null)
            return NotFound(new { message = "Solicitação de matrícula não encontrada." });

        if (solicitacao.Status != StatusMatricula.Pendente)
            return BadRequest(new { message = "Esta solicitação já foi respondida anteriormente." });

        solicitacao.Status = dto.Aprovar ? StatusMatricula.Aprovada : StatusMatricula.Rejeitada;
        solicitacao.Observacao = dto.Observacao;

        await _db.SaveChangesAsync();

        // Opcional: e-mail informando aprovação/rejeição
        try
        {
            var assunto = dto.Aprovar
                ? "Matrícula aprovada – EduConnect"
                : "Matrícula analisada – EduConnect";

            var statusTexto = dto.Aprovar ? "APROVADA" : "REJEITADA";

            var mensagem =
                $"Olá {solicitacao.Nome},\n\n" +
                $"Sua solicitação de matrícula foi {statusTexto}.\n";

            if (!string.IsNullOrWhiteSpace(dto.Observacao))
            {
                mensagem += $"\nObservação: {dto.Observacao}\n";
            }

            mensagem += "\nAtenciosamente,\nPortal EduConnect";

            await _email.EnviarAsync(solicitacao.Email, assunto, mensagem);
        }
        catch
        {
            // idem: aqui poderia logar o erro
        }

        return NoContent();
    }
}
