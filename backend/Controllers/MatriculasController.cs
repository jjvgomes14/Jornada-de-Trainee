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

    private async Task<string> GerarProximoRAAsync()
    {
        var rasExistentes = await _db.Alunos
            .AsNoTracking()
            .Select(a => a.RA)
            .Where(ra => !string.IsNullOrWhiteSpace(ra))
            .ToListAsync();

        var maiorNumero = 0;

        foreach (var ra in rasExistentes)
        {
            var digitos = new string((ra ?? string.Empty).Where(char.IsDigit).ToArray());

            if (int.TryParse(digitos, out var numero) && numero > maiorNumero)
                maiorNumero = numero;
        }

        return (maiorNumero + 1).ToString("D6");
    }

    [HttpPost("solicitar")]
    [AllowAnonymous]
    public async Task<IActionResult> Solicitar([FromBody] MatriculaSolicitacaoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailNormalizado = dto.Email.Trim();
        var cpfNormalizado = dto.CPF.Trim();
        var cursoDesejadoNormalizado = dto.CursoDesejado.Trim();

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
            CursoDesejado = cursoDesejadoNormalizado,
            CEP = dto.CEP.Trim(),
            Estado = dto.Estado.Trim(),
            Cidade = dto.Cidade.Trim(),
            Bairro = dto.Bairro.Trim(),
            Rua = dto.Rua.Trim(),
            NumeroCasa = dto.NumeroCasa.Trim(),

            ComprovanteEnderecoNomeArquivo = dto.ComprovanteEnderecoNomeArquivo.Trim(),
            ComprovanteEnderecoContentType = dto.ComprovanteEnderecoContentType.Trim(),
            ComprovanteEnderecoBase64 = dto.ComprovanteEnderecoBase64.Trim(),

            HistoricoEscolarNomeArquivo = dto.HistoricoEscolarNomeArquivo.Trim(),
            HistoricoEscolarContentType = dto.HistoricoEscolarContentType.Trim(),
            HistoricoEscolarBase64 = dto.HistoricoEscolarBase64.Trim(),

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
                $"Curso desejado: {solicitacao.CursoDesejado}\n\n" +
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
                cursoDesejado = s.CursoDesejado,
                cep = s.CEP,
                estado = s.Estado,
                cidade = s.Cidade,
                bairro = s.Bairro,
                rua = s.Rua,
                numeroCasa = s.NumeroCasa,

                comprovanteEnderecoNomeArquivo = s.ComprovanteEnderecoNomeArquivo,
                comprovanteEnderecoContentType = s.ComprovanteEnderecoContentType,
                comprovanteEnderecoBase64 = s.ComprovanteEnderecoBase64,

                historicoEscolarNomeArquivo = s.HistoricoEscolarNomeArquivo,
                historicoEscolarContentType = s.HistoricoEscolarContentType,
                historicoEscolarBase64 = s.HistoricoEscolarBase64
            })
            .ToListAsync();

        return Ok(pendentes);
    }

    [HttpGet("proximo-ra")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<ActionResult<object>> GetProximoRa()
    {
        var proximoRa = await GerarProximoRAAsync();
        return Ok(new { ra = proximoRa });
    }

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
        string? raFinal = null;
        string? turmaFinal = null;

        if (dto.Aprovar)
        {
            var raNormalizado = string.IsNullOrWhiteSpace(dto.RA)
                ? await GerarProximoRAAsync()
                : dto.RA.Trim();

            var turmaNormalizada = string.IsNullOrWhiteSpace(dto.Turma)
                ? solicitacao.CursoDesejado.Trim()
                : dto.Turma.Trim();

            raFinal = raNormalizado;
            turmaFinal = turmaNormalizada;

            if (string.IsNullOrWhiteSpace(turmaNormalizada))
            {
                return BadRequest(new
                {
                    message = "Para aprovar a matrícula, informe a Turma/Curso."
                });
            }

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
                    RA = raNormalizado,
                    Turma = turmaNormalizada,
                    Curso = solicitacao.CursoDesejado,
                    DataNascimento = solicitacao.DataNascimento,
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
                solicitacao.Observacao = string.IsNullOrWhiteSpace(dto.Observacao)
                    ? null
                    : dto.Observacao.Trim();

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
            solicitacao.Observacao = string.IsNullOrWhiteSpace(dto.Observacao)
                ? null
                : dto.Observacao.Trim();

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
                mensagem += $"Curso: {solicitacao.CursoDesejado}\n";
                mensagem += $"Turma: {turmaFinal}\n";
                mensagem += $"RA: {raFinal}\n\n";

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
                mensagem += $"Observação: {dto.Observacao.Trim()}\n\n";
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