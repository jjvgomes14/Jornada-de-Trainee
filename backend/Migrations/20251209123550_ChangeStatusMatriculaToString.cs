using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class ChangeStatusMatriculaToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Eventos_Professores_ProfessorId",
                table: "Eventos");

            migrationBuilder.DropForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores");

            migrationBuilder.RenameIndex(
                name: "IX_Usuarios_Username",
                table: "Usuarios",
                newName: "IX_Usuario_Username");

            migrationBuilder.RenameIndex(
                name: "IX_Alunos_RA",
                table: "Alunos",
                newName: "IX_Aluno_RA");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "Valor",
                table: "Notas",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AddForeignKey(
                name: "FK_Eventos_Professores_ProfessorId",
                table: "Eventos",
                column: "ProfessorId",
                principalTable: "Professores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Eventos_Professores_ProfessorId",
                table: "Eventos");

            migrationBuilder.DropForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores");

            migrationBuilder.RenameIndex(
                name: "IX_Usuario_Username",
                table: "Usuarios",
                newName: "IX_Usuarios_Username");

            migrationBuilder.RenameIndex(
                name: "IX_Aluno_RA",
                table: "Alunos",
                newName: "IX_Alunos_RA");

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "SolicitacoesMatricula",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<decimal>(
                name: "Valor",
                table: "Notas",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddForeignKey(
                name: "FK_Eventos_Professores_ProfessorId",
                table: "Eventos",
                column: "ProfessorId",
                principalTable: "Professores",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Professores_Usuarios_UsuarioId",
                table: "Professores",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id");
        }
    }
}
