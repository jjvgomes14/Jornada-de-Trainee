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
    private readonly ILogger<MatriculasController> _logger;

    public MatriculasController(
        ApplicationDbContext db,
        EmailService email,
        ILogger<MatriculasController> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

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

    // =========================
    // 1) SOLICITAR MATRÍCULA
    // =========================

    // POST: /api/Matriculas/solicitar
    [HttpPost("solicitar")]
    [AllowAnonymous]
    public async Task<IActionResult> Solicitar([FromBody] MatriculaSolicitacaoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailNormalizado = dto.Email.Trim();
        var cpfNormalizado = dto.CPF.Trim();

        var jaExisteAluno = await _db.Alunos.AnyAsync(a =>
            a.Email == emailNormalizado || a.CPF == cpfNormalizado);

        if (jaExisteAluno)
        {
            return Conflict(new
            {
                message = "Já existe um aluno cadastrado com este e-mail ou CPF."
            });
        }

        var jaExisteSolicitacaoPendente = await _db.SolicitacoesMatricula.AnyAsync(s =>
            s.Status == StatusMatricula.Pendente &&
            (s.Email == emailNormalizado || s.CPF == cpfNormalizado));

        if (jaExisteSolicitacaoPendente)
        {
            return Conflict(new
            {
                message = "Já existe uma solicitação de matrícula pendente com este e-mail ou CPF."
            });
        }

        var solicitacao = new SolicitacaoMatricula
        {
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            DataNascimento = dto.DataNascimento.Date,
            RG = dto.RG.Trim(),
            CPF = cpfNormalizado,
            Celular = dto.Celular.Trim(),
            CEP = dto.CEP.Trim(),
            Estado = dto.Estado.Trim(),
            Cidade = dto.Cidade.Trim(),
            Bairro = dto.Bairro.Trim(),
            Rua = dto.Rua.Trim(),
            NumeroCasa = dto.NumeroCasa.Trim(),
            CriadoEm = DateTime.UtcNow,
            Status = StatusMatricula.Pendente
        };

        _db.SolicitacoesMatricula.Add(solicitacao);
        await _db.SaveChangesAsync();

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
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Solicitação registrada, mas houve falha ao enviar e-mail de confirmação. SolicitacaoId={SolicitacaoId}",
                solicitacao.Id);
        }

        return Ok(new { message = "Solicitação registrada com sucesso." });
    }

    // =========================
    // 2) LISTAR PENDENTES
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
            .Select(s => new
            {
                s.Id,
                s.Nome,
                s.Email,
                dataNascimento = s.DataNascimento,
                dataCriacao = s.CriadoEm,
                status = s.Status.ToString(),
                s.Observacao,
                rg = s.RG,
                cpf = s.CPF,
                celular = s.Celular,
                cep = s.CEP,
                estado = s.Estado,
                cidade = s.Cidade,
                bairro = s.Bairro,
                rua = s.Rua,
                numeroCasa = s.NumeroCasa
            })
            .ToListAsync();

        return Ok(pendentes);
    }

    // =========================
    // 3) RESPONDER MATRÍCULA
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
        {
            return BadRequest(new
            {
                message = "Esta solicitação já foi respondida anteriormente."
            });
        }

        string? usernameGerado = null;
        string? senhaGerada = null;

        if (dto.Aprovar)
        {
            if (string.IsNullOrWhiteSpace(dto.RA) || string.IsNullOrWhiteSpace(dto.Turma))
            {
                return BadRequest(new
                {
                    message = "Para aprovar a matrícula, informe RA e Turma."
                });
            }

            var raNormalizado = dto.RA.Trim();
            var turmaNormalizada = dto.Turma.Trim();

            var raJaExiste = await _db.Alunos.AnyAsync(a => a.RA == raNormalizado);
            if (raJaExiste)
            {
                return BadRequest(new
                {
                    message = "Já existe um aluno cadastrado com esse RA."
                });
            }

            var emailJaExiste = await _db.Alunos.AnyAsync(a => a.Email == solicitacao.Email);
            if (emailJaExiste)
            {
                return BadRequest(new
                {
                    message = "Já existe um aluno cadastrado com este e-mail."
                });
            }

            var cpfJaExiste = await _db.Alunos.AnyAsync(a => a.CPF == solicitacao.CPF);
            if (cpfJaExiste)
            {
                return BadRequest(new
                {
                    message = "Já existe um aluno cadastrado com este CPF."
                });
            }

            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                usernameGerado = await GerarUsernameUnicoAsync(solicitacao.Nome);
                senhaGerada = GerarSenhaAleatoria();

                var usuario = new Usuario
                {
                    Username = usernameGerado,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(senhaGerada),
                    Role = UserRoles.Aluno,
                    PrimeiroAcesso = true
                };

                _db.Usuarios.Add(usuario);
                await _db.SaveChangesAsync();

                var aluno = new Aluno
                {
                    Nome = solicitacao.Nome,
                    Email = solicitacao.Email,
                    DataNascimento = solicitacao.DataNascimento,
                    RA = raNormalizado,
                    Turma = turmaNormalizada,
                    RG = solicitacao.RG,
                    CPF = solicitacao.CPF,
                    Celular = solicitacao.Celular,
                    CEP = solicitacao.CEP,
                    Estado = solicitacao.Estado,
                    Cidade = solicitacao.Cidade,
                    Bairro = solicitacao.Bairro,
                    Rua = solicitacao.Rua,
                    NumeroCasa = solicitacao.NumeroCasa,
                    UsuarioId = usuario.Id
                };

                _db.Alunos.Add(aluno);

                solicitacao.Status = StatusMatricula.Aprovada;
                solicitacao.Observacao = dto.Observacao;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                _logger.LogError(
                    ex,
                    "Erro ao aprovar solicitação de matrícula Id={SolicitacaoId}",
                    solicitacao.Id);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Ocorreu um erro ao aprovar a solicitação."
                });
            }
        }
        else
        {
            solicitacao.Status = StatusMatricula.Rejeitada;
            solicitacao.Observacao = dto.Observacao;
            await _db.SaveChangesAsync();
        }

        try
        {
            var assunto = dto.Aprovar
                ? "Matrícula aprovada – dados de acesso ao Portal EduConnect"
                : "Matrícula analisada – EduConnect";

            var mensagem = $"Olá {solicitacao.Nome},\n\n";

            if (dto.Aprovar)
            {
                mensagem += "Sua solicitação de matrícula foi APROVADA.\n\n";

                if (!string.IsNullOrWhiteSpace(usernameGerado) && !string.IsNullOrWhiteSpace(senhaGerada))
                {
                    mensagem +=
                        "Segue abaixo seus dados de acesso ao Portal EduConnect:\n" +
                        $"Usuário: {usernameGerado}\n" +
                        $"Senha inicial: {senhaGerada}\n\n" +
                        "No primeiro acesso você será solicitado a definir uma nova senha.\n\n";
                }
            }
            else
            {
                mensagem += "Sua solicitação de matrícula foi REJEITADA.\n\n";
            }

            if (!string.IsNullOrWhiteSpace(dto.Observacao))
            {
                mensagem += $"Observação: {dto.Observacao}\n\n";
            }

            mensagem += "Atenciosamente,\nPortal EduConnect";

            await _email.EnviarAsync(solicitacao.Email, assunto, mensagem);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Solicitação respondida, mas houve falha ao enviar e-mail. SolicitacaoId={SolicitacaoId}",
                solicitacao.Id);
        }

        return NoContent();
    }
}