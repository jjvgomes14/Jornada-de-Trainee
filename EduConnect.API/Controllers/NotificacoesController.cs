using EduConnect.Api.Data;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificacoesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public NotificacoesController(ApplicationDbContext db) => _db = db;

    // GET: /api/Notificacoes/eventos
    // Aluno vê lista de notificações de eventos
    [HttpGet("eventos")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<IActionResult> ListarEventos([FromQuery] int limit = 50)
    {
        if (limit <= 0) limit = 50;
        if (limit > 200) limit = 200;

        var list = await _db.NotificacoesEventos
            .AsNoTracking()
            .Where(n => n.PublicoAlvo == "Aluno")
            .OrderByDescending(n => n.CriadaEm)
            .Take(limit)
            .ToListAsync();

        return Ok(list);
    }
}
