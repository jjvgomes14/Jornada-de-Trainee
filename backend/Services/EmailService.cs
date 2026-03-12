using System.Net;
using System.Net.Mail;

namespace EduConnect.Api.Services;

public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IConfiguration config,
        ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task EnviarAsync(string destinatario, string assunto, string mensagem)
    {
        var host = _config["Smtp:Host"];
        var porta = _config["Smtp:Port"];
        var usuario = _config["Smtp:Username"];
        var senha = _config["Smtp:Password"];
        var remetente = _config["Smtp:From"];

        if (string.IsNullOrWhiteSpace(destinatario))
            throw new ArgumentException("Destinatário não informado.", nameof(destinatario));

        if (string.IsNullOrWhiteSpace(assunto))
            throw new ArgumentException("Assunto não informado.", nameof(assunto));

        if (string.IsNullOrWhiteSpace(mensagem))
            throw new ArgumentException("Mensagem não informada.", nameof(mensagem));

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(porta) ||
            string.IsNullOrWhiteSpace(usuario) ||
            string.IsNullOrWhiteSpace(senha) ||
            string.IsNullOrWhiteSpace(remetente))
        {
            _logger.LogWarning(
                "Configuração SMTP incompleta. E-mail não enviado para {Destinatario}.",
                destinatario);

            return;
        }

        if (!int.TryParse(porta, out var portaInt))
        {
            _logger.LogWarning(
                "Porta SMTP inválida: {Porta}. E-mail não enviado para {Destinatario}.",
                porta,
                destinatario);

            return;
        }

        using var smtp = new SmtpClient(host, portaInt)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(usuario, senha)
        };

        using var mail = new MailMessage(remetente, destinatario)
        {
            Subject = assunto,
            Body = mensagem,
            IsBodyHtml = false
        };

        try
        {
            await smtp.SendMailAsync(mail);

            _logger.LogInformation(
                "E-mail enviado com sucesso para {Destinatario}. Assunto: {Assunto}",
                destinatario,
                assunto);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Erro ao enviar e-mail para {Destinatario}. Assunto: {Assunto}",
                destinatario,
                assunto);

            throw;
        }
    }
}