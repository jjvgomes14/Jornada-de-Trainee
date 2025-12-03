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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Índice único para RA e Username
        modelBuilder.Entity<Aluno>()
            .HasIndex(a => a.RA)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Relacionamentos de Nota
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
    }
}
