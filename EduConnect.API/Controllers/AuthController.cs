using EduConnect.Api.Data;
using EduConnect.Api.DTOs;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using EduConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly JwtService _jwt;

    public AuthController(ApplicationDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        var user = await _db.Usuarios.SingleOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Usuário ou senha inválidos." });

        var token = _jwt.GerarToken(user);

        return new LoginResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            MustChangePassword = user.PrimeiroAcesso
        };
    }

    // Opcional: endpoint para criar usuários (apenas Admin)
    [HttpPost("registrar")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Registrar([FromBody] LoginRequestDto dto)
    {
        if (await _db.Usuarios.AnyAsync(u => u.Username == dto.Username))
            return BadRequest(new { message = "Username já existe." });

        var usuario = new Usuario
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRoles.Aluno,
            PrimeiroAcesso = true
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // NOVO: alterar senha no primeiro acesso
    [HttpPost("alterar-senha-primeiro-acesso")]
    [Authorize]
    public async Task<IActionResult> AlterarSenhaPrimeiroAcesso([FromBody] ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Length < 6)
            return BadRequest(new { message = "A nova senha deve ter pelo menos 6 caracteres." });

        var username = User.Identity?.Name
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized();

        var user = await _db.Usuarios.SingleOrDefaultAsync(u => u.Username == username);
        if (user == null) return NotFound();

        if (!user.PrimeiroAcesso)
            return BadRequest(new { message = "Este usuário já realizou o primeiro acesso." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
        user.PrimeiroAcesso = false;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
