using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioToProfessor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UsuarioId",
                table: "Professores",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Professores_UsuarioId",
                table: "Professores",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores");

            migrationBuilder.DropIndex(
                name: "IX_Professores_UsuarioId",
                table: "Professores");

            migrationBuilder.DropColumn(
                name: "UsuarioId",
                table: "Professores");
        }
    }
}
