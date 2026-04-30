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
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext db,
        JwtService jwt,
        ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    public class RegisterUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = UserRoles.Aluno;
    }

    //Helpers
    private static string NormalizarUsername(string? username)
    {
        return (username ?? string.Empty).Trim();
    }

    private static bool RoleEhValida(string role)
    {
        return role == UserRoles.Aluno ||
               role == UserRoles.Professor ||
               role == UserRoles.Administrador;
    }

    //Login
    // POST: /api/Auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var username = NormalizarUsername(dto.Username);

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new
            {
                message = "Usuário e senha são obrigatórios."
            });
        }

        var user = await _db.Usuarios
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Username == username);

        if (user == null)
        {
            return Unauthorized(new
            {
                message = "Usuário ou senha inválidos."
            });
        }

        var senhaOk = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!senhaOk)
        {
            return Unauthorized(new
            {
                message = "Usuário ou senha inválidos."
            });
        }

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

    //Cadastro de Usuário
    // POST: /api/Auth/registrar
    [HttpPost("registrar")]
    [Authorize(Roles = UserRoles.Administrador)]
    public async Task<IActionResult> Registrar([FromBody] RegisterUserDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new
            {
                message = "Dados do usuário não informados."
            });
        }

        var username = NormalizarUsername(dto.Username);
        var role = (dto.Role ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new
            {
                message = "Usuário e senha são obrigatórios."
            });
        }

        if (dto.Password.Length < 6)
        {
            return BadRequest(new
            {
                message = "A senha deve ter pelo menos 6 caracteres."
            });
        }

        if (!RoleEhValida(role))
        {
            return BadRequest(new
            {
                message = "Role inválida."
            });
        }

        var jaExiste = await _db.Usuarios.AnyAsync(u => u.Username == username);
        if (jaExiste)
        {
            return Conflict(new
            {
                message = "Já existe um usuário com esse username."
            });
        }

        var usuario = new Usuario
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = role,
            PrimeiroAcesso = false
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return Created(string.Empty, new
        {
            usuario.Id,
            usuario.Username,
            usuario.Role
        });
    }

    //Alterar senha 1º acesso
    // POST: /api/Auth/alterar-senha-primeiro-acesso
    [HttpPost("alterar-senha-primeiro-acesso")]
    [Authorize]
    public async Task<IActionResult> AlterarSenhaPrimeiroAcesso([FromBody] ChangePasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Length < 6)
        {
            return BadRequest(new
            {
                message = "A nova senha deve ter pelo menos 6 caracteres."
            });
        }

        var userIdStr = User.FindFirstValue("userId");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new
            {
                message = "Usuário não identificado no token."
            });
        }

        var user = await _db.Usuarios.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        if (!user.PrimeiroAcesso)
        {
            return BadRequest(new
            {
                message = "Este usuário já realizou o primeiro acesso."
            });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
        user.PrimeiroAcesso = false;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    //Alterar senha
    // POST: /api/Auth/alterar-senha
    [HttpPost("alterar-senha")]
    [Authorize]
    public async Task<IActionResult> AlterarSenha([FromBody] ChangePasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Length < 6)
        {
            return BadRequest(new
            {
                message = "A nova senha deve ter pelo menos 6 caracteres."
            });
        }

        var userIdStr = User.FindFirstValue("userId");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new
            {
                message = "Usuário não identificado no token."
            });
        }

        var user = await _db.Usuarios.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
        user.PrimeiroAcesso = false;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    //Usuario logado
    // GET: /api/Auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new
            {
                message = "Usuário não identificado no token."
            });
        }

        var user = await _db.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Role,
            user.PrimeiroAcesso
        });
    }
}