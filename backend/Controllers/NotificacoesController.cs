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

    // ✅ DELETE: /api/Notificacoes/eventos/{id}
    [HttpDelete("eventos/{id:int}")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<IActionResult> ExcluirEvento(int id)
    {
        var notif = await _db.NotificacoesEventos
            .FirstOrDefaultAsync(n => n.Id == id && n.PublicoAlvo == "Aluno");

        if (notif == null)
            return NotFound(new { message = "Notificação não encontrada." });

        _db.NotificacoesEventos.Remove(notif);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ✅ DELETE: /api/Notificacoes/eventos  (limpar tudo)
    [HttpDelete("eventos")]
    [Authorize(Roles = UserRoles.Aluno)]
    public async Task<IActionResult> LimparEventos()
    {
        var list = await _db.NotificacoesEventos
            .Where(n => n.PublicoAlvo == "Aluno")
            .ToListAsync();

        if (list.Count == 0)
            return NoContent();

        _db.NotificacoesEventos.RemoveRange(list);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
