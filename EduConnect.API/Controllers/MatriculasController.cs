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
        // Pega só os primeiros N caracteres de um GUID sem traços
        return Guid.NewGuid()
            .ToString("N")
            .Substring(0, tamanho);
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

            RG = dto.RG.Trim(),
            CPF = dto.CPF.Trim(),
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

        var resultado = pendentes.Select(s => new
        {
            s.Id,
            s.Nome,
            s.Email,
            dataNascimento = s.DataNascimento,
            dataCriacao = s.CriadoEm,
            status = s.Status.ToString(),
            s.Observacao,

            // 👇 campos extras para preencher o modal de cadastro de aluno
            rg = s.RG,
            cpf = s.CPF,
            celular = s.Celular,
            cep = s.CEP,
            estado = s.Estado,
            cidade = s.Cidade,
            bairro = s.Bairro,
            rua = s.Rua,
            numeroCasa = s.NumeroCasa
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

        // vamos guardar aqui para usar no e-mail
        string? usernameGerado = null;
        string? senhaGerada = null;

        // Se for aprovar, precisamos de RA e Turma e criamos o aluno + usuário
        if (dto.Aprovar)
        {
            if (string.IsNullOrWhiteSpace(dto.RA) || string.IsNullOrWhiteSpace(dto.Turma))
            {
                return BadRequest(new { message = "Para aprovar a matrícula, informe RA e Turma." });
            }

            var raNormalizado = dto.RA.Trim();

            // Garante que não terá RA duplicado
            var raJaExiste = await _db.Alunos.AnyAsync(a => a.RA == raNormalizado);
            if (raJaExiste)
            {
                return BadRequest(new { message = "Já existe um aluno cadastrado com esse RA." });
            }

            var aluno = new Aluno
            {
                Nome = solicitacao.Nome,
                Email = solicitacao.Email,
                DataNascimento = solicitacao.DataNascimento,
                RA = raNormalizado,
                Turma = dto.Turma.Trim(),

                RG = solicitacao.RG,
                CPF = solicitacao.CPF,
                Celular = solicitacao.Celular,
                CEP = solicitacao.CEP,
                Estado = solicitacao.Estado,
                Cidade = solicitacao.Cidade,
                Bairro = solicitacao.Bairro,
                Rua = solicitacao.Rua,
                NumeroCasa = solicitacao.NumeroCasa
            };

            _db.Alunos.Add(aluno);

            // ==== cria usuário de portal para o aluno ====
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
            // =============================================

            solicitacao.Status = StatusMatricula.Aprovada;
            solicitacao.Observacao = dto.Observacao;
        }
        else
        {
            // Rejeitada
            solicitacao.Status = StatusMatricula.Rejeitada;
            solicitacao.Observacao = dto.Observacao;
        }

        await _db.SaveChangesAsync();

        // E-mail informando aprovação/rejeição + (se aprovado) login e senha
        try
        {
            var assunto = dto.Aprovar
                ? "Matrícula aprovada – dados de acesso ao Portal EduConnect"
                : "Matrícula analisada – EduConnect";

            var mensagem = $"Olá {solicitacao.Nome},\n\n";

            if (dto.Aprovar)
            {
                mensagem += "Sua solicitação de matrícula foi APROVADA.\n\n";

                if (!string.IsNullOrEmpty(usernameGerado) && !string.IsNullOrEmpty(senhaGerada))
                {
                    mensagem += "Segue abaixo seus dados de acesso ao Portal EduConnect:\n" +
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
        catch
        {
            // aqui poderia logar o erro
        }

        return NoContent();
    }

}
