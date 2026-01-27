using System.Security.Claims;
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
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly JwtService _jwt;

    public AuthController(ApplicationDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // =============== LOGIN ===============
    // POST: /api/Auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Usuário e senha são obrigatórios." });

        var user = await _db.Usuarios
            .SingleOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null)
            return Unauthorized(new { message = "Usuário ou senha inválidos." });

        var senhaOk = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!senhaOk)
            return Unauthorized(new { message = "Usuário ou senha inválidos." });

        var token = _jwt.GerarToken(user);

        var resposta = new LoginResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            MustChangePassword = user.PrimeiroAcesso
        };

        return Ok(resposta);
    }

    // =============== REGISTRAR USUÁRIO (ADMIN) ===============
    // DTO simples só para esse endpoint
    public class RegisterUserDto
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = UserRoles.Aluno;
    }

    // POST: /api/Auth/registrar
    [HttpPost("registrar")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Registrar([FromBody] RegisterUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Usuário e senha são obrigatórios." });

        var roleValida = dto.Role == UserRoles.Aluno ||
                         dto.Role == UserRoles.Professor ||
                         dto.Role == UserRoles.Administrador;

        if (!roleValida)
            return BadRequest(new { message = "Role inválida." });

        var jaExiste = await _db.Usuarios.AnyAsync(u => u.Username == dto.Username);
        if (jaExiste)
            return Conflict(new { message = "Já existe um usuário com esse username." });

        var usuario = new Usuario
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            // Quem o admin cria geralmente não é "primeiro acesso obrigatório"
            PrimeiroAcesso = false
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Login), new { dto.Username }, new
        {
            usuario.Id,
            usuario.Username,
            usuario.Role
        });
    }

    // =============== ALTERAR SENHA NO PRIMEIRO ACESSO ===============
    // POST: /api/Auth/alterar-senha-primeiro-acesso
    [HttpPost("alterar-senha-primeiro-acesso")]
    [Authorize]
    public async Task<IActionResult> AlterarSenhaPrimeiroAcesso([FromBody] ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Length < 6)
            return BadRequest(new { message = "A nova senha deve ter pelo menos 6 caracteres." });

        // Username vem do token (JwtService adiciona ClaimTypes.Name)
        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrEmpty(username))
            return Unauthorized(new { message = "Usuário não identificado no token." });

        var user = await _db.Usuarios.SingleOrDefaultAsync(u => u.Username == username);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        if (!user.PrimeiroAcesso)
            return BadRequest(new { message = "Este usuário já realizou o primeiro acesso." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
        user.PrimeiroAcesso = false;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
