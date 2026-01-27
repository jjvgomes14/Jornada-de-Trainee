using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPrimeiroAcessoToUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Disciplinas_DisciplinaId",
                table: "Notas");

            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Professores_ProfessorId",
                table: "Notas");

            migrationBuilder.AddColumn<bool>(
                name: "PrimeiroAcesso",
                table: "Usuarios",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Disciplinas_DisciplinaId",
                table: "Notas",
                column: "DisciplinaId",
                principalTable: "Disciplinas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Professores_ProfessorId",
                table: "Notas",
                column: "ProfessorId",
                principalTable: "Professores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Disciplinas_DisciplinaId",
                table: "Notas");

            migrationBuilder.DropForeignKey(
                name: "FK_Notas_Professores_ProfessorId",
                table: "Notas");

            migrationBuilder.DropColumn(
                name: "PrimeiroAcesso",
                table: "Usuarios");

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Disciplinas_DisciplinaId",
                table: "Notas",
                column: "DisciplinaId",
                principalTable: "Disciplinas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notas_Professores_ProfessorId",
                table: "Notas",
                column: "ProfessorId",
                principalTable: "Professores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
