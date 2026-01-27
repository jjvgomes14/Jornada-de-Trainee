using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EduConnect.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EduConnect.Api.Services;

public class JwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GerarToken(Usuario usuario)
    {
        // Lê configurações do appsettings.json
        var key = _config["Jwt:Key"];
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"]; // opcional

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("A chave JWT (Jwt:Key) não está configurada.");

        // Chave simétrica e credenciais de assinatura
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        // Claims principais
        var claims = new List<Claim>
        {
            // Identificação padrão
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),

            // Usado pelos controllers: User.Identity.Name / ClaimTypes.Name
            new Claim(ClaimTypes.Name, usuario.Username),

            // Role para [Authorize(Roles = ...)]
            new Claim(ClaimTypes.Role, usuario.Role),

            // Usado para ligar com Professor.UsuarioId / outras entidades
            new Claim("userId", usuario.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8), // validade de 8h
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
