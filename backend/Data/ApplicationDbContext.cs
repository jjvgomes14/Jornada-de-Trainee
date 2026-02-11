using EduConnect.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Aluno> Alunos => Set<Aluno>();
    public DbSet<Professor> Professores => Set<Professor>();
    public DbSet<Disciplina> Disciplinas => Set<Disciplina>();
    public DbSet<Nota> Notas => Set<Nota>();
    public DbSet<EventoCalendario> Eventos => Set<EventoCalendario>();
    public DbSet<SolicitacaoMatricula> SolicitacoesMatricula => Set<SolicitacaoMatricula>();
    public DbSet<NotificacaoEvento> NotificacoesEventos => Set<NotificacaoEvento>();

    public DbSet<Presenca> Presencas => Set<Presenca>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Username)
            .IsUnique()
            .HasDatabaseName("IX_Usuario_Username");

        modelBuilder.Entity<Aluno>()
            .HasIndex(a => a.RA)
            .IsUnique()
            .HasDatabaseName("IX_Aluno_RA");

        modelBuilder.Entity<Professor>()
            .HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(p => p.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Nota>()
            .HasOne(n => n.Aluno)
            .WithMany(a => a.Notas)
            .HasForeignKey(n => n.AlunoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Nota>()
            .HasOne(n => n.Professor)
            .WithMany()
            .HasForeignKey(n => n.ProfessorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Nota>()
            .HasOne(n => n.Disciplina)
            .WithMany()
            .HasForeignKey(n => n.DisciplinaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EventoCalendario>()
            .HasOne<Professor>()
            .WithMany()
            .HasForeignKey(e => e.ProfessorId)
            .OnDelete(DeleteBehavior.SetNull);

        // -------- PRESENCAS --------
        modelBuilder.Entity<Presenca>()
            .HasOne(p => p.Aluno)
            .WithMany()
            .HasForeignKey(p => p.AlunoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Presenca>()
            .HasOne(p => p.Professor)
            .WithMany()
            .HasForeignKey(p => p.ProfessorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Presenca>()
            .HasOne(p => p.Disciplina)
            .WithMany()
            .HasForeignKey(p => p.DisciplinaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Presenca>()
            .HasIndex(p => new { p.AlunoId, p.ProfessorId, p.DisciplinaId, p.DataAula })
            .IsUnique()
            .HasDatabaseName("IX_Presenca_Aluno_Professor_Disciplina_DataAula");

        modelBuilder.Entity<SolicitacaoMatricula>()
            .Property(s => s.Status)
            .HasConversion<string>();
    }
}
