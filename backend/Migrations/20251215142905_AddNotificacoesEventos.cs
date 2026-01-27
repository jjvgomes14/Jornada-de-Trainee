using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificacoesEventos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificacoesEventos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublicoAlvo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProfessorNome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProfessorDisciplina = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EventoId = table.Column<int>(type: "int", nullable: true),
                    EventoTitulo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DataEvento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Titulo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Mensagem = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificacoesEventos", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificacoesEventos");
        }
    }
}
