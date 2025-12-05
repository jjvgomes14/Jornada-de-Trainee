using EduConnect.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // ========== ENTIDADES ==========
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Aluno> Alunos => Set<Aluno>();
    public DbSet<Professor> Professores => Set<Professor>();
    public DbSet<Disciplina> Disciplinas => Set<Disciplina>();
    public DbSet<Nota> Notas => Set<Nota>();
    public DbSet<EventoCalendario> Eventos => Set<EventoCalendario>();
    public DbSet<SolicitacaoMatricula> SolicitacoesMatricula => Set<SolicitacaoMatricula>();


    // ========== CONFIGURAÇÃO DO MODELO ==========
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ------------------------------
        // USUÁRIOS
        // ------------------------------
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Username)
            .IsUnique()
            .HasDatabaseName("IX_Usuario_Username");

        // ------------------------------
        // ALUNOS
        // ------------------------------
        modelBuilder.Entity<Aluno>()
            .HasIndex(a => a.RA)
            .IsUnique()
            .HasDatabaseName("IX_Aluno_RA");

        // ------------------------------
        // PROFESSORES
        // Vincula opcionalmente o usuário
        // ------------------------------
        modelBuilder.Entity<Professor>()
            .HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(p => p.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        // ------------------------------
        // NOTAS
        // Cada nota pertence a:
        // - um aluno
        // - um professor
        // - uma disciplina
        // ------------------------------
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

        // ------------------------------
        // EVENTOS DO CALENDÁRIO
        // ProfessorId é opcional
        // ------------------------------
        modelBuilder.Entity<EventoCalendario>()
            .HasOne<Professor>()
            .WithMany()
            .HasForeignKey(e => e.ProfessorId)
            .OnDelete(DeleteBehavior.SetNull);

        // ------------------------------
        // SOLICITAÇÕES DE MATRÍCULA
        // ------------------------------
        modelBuilder.Entity<SolicitacaoMatricula>()
            .Property(s => s.Status)
            .HasConversion<string>(); // salva "Pendente", "Aprovada", "Rejeitada"
    }
}
