// EmailService.cs
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace EduConnect.Api.Services;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task EnviarAsync(string destinatario, string assunto, string mensagem)
    {
        var host = _config["Email:SmtpHost"];
        var portaStr = _config["Email:SmtpPort"];
        var usuario = _config["Email:User"];
        var senha = _config["Email:Password"];
        var remetente = _config["Email:From"] ?? usuario;

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portaStr) ||
            string.IsNullOrWhiteSpace(usuario) ||
            string.IsNullOrWhiteSpace(senha) ||
            string.IsNullOrWhiteSpace(remetente))
        {
            // Não quebra se não estiver configurado
            return;
        }

        if (!int.TryParse(portaStr, out var porta))
        {
            porta = 587;
        }

        using var client = new SmtpClient(host, porta)
        {
            Credentials = new NetworkCredential(usuario, senha),
            EnableSsl = true
        };

        using var mail = new MailMessage(remetente, destinatario, assunto, mensagem);
        await client.SendMailAsync(mail);
    }
}
