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
        // Lê configurações do appsettings.json
        var host = _config["Smtp:Host"];
        var porta = _config["Smtp:Port"];
        var usuario = _config["Smtp:Username"];
        var senha = _config["Smtp:Password"];
        var remetente = _config["Smtp:From"];

        // Se não houver configuração → não envia, mas não quebra o sistema
        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(porta) ||
            string.IsNullOrWhiteSpace(usuario) ||
            string.IsNullOrWhiteSpace(senha) ||
            string.IsNullOrWhiteSpace(remetente))
        {
            // Aqui você poderia registrar um log, se quisesse
            return;
        }

        using var smtp = new SmtpClient(host, int.Parse(porta))
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
        }
        catch
        {
            // Silencioso por padrão, igual ao design original
            // Se quiser logging, basta adicionar aqui
        }
    }
}
