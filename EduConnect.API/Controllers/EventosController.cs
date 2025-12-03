using System.Security.Claims;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventosController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public EventosController(ApplicationDbContext db)
    {
        _db = db;
    }

    private int? GetUserId()
    {
        var userIdStr = User.FindFirstValue("userId");
        if (int.TryParse(userIdStr, out var id))
            return id;
        return null;
    }

    private async Task<Professor?> GetProfessorLogadoAsync()
    {
        var userId = GetUserId();
        if (userId == null) return null;

        return await _db.Professores
            .FirstOrDefaultAsync(p => p.UsuarioId == userId.Value);
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<EventoCalendario>>> GetAll()
    {
        var lista = await _db.Eventos.AsNoTracking().ToListAsync();
        return Ok(lista);
    }

    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<ActionResult<EventoCalendario>> Create([FromBody] EventoCalendario dto)
    {
        Professor? prof = null;

        if (User.IsInRole(UserRoles.Professor))
            prof = await GetProfessorLogadoAsync();

        var ev = new EventoCalendario
        {
            Titulo = dto.Titulo,
            DataInicio = dto.DataInicio,
            DataFim = dto.DataFim,
            ProfessorId = prof?.Id
        };

        _db.Eventos.Add(ev);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<EventoCalendario>> GetById(int id)
    {
        var ev = await _db.Eventos.FindAsync(id);
        return ev == null ? NotFound() : ev;
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> Update(int id, [FromBody] EventoCalendario dto)
    {
        if (id != dto.Id) return BadRequest();

        var ev = await _db.Eventos.FindAsync(id);
        if (ev == null) return NotFound();

        ev.Titulo = dto.Titulo;
        ev.DataInicio = dto.DataInicio;
        ev.DataFim = dto.DataFim;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = $"{UserRoles.Professor},{UserRoles.Administrador}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ev = await _db.Eventos.FindAsync(id);
        if (ev == null) return NotFound();

        _db.Eventos.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
