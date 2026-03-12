using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioIdToAluno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Alunos",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CPF",
                table: "Alunos",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "UsuarioId",
                table: "Alunos",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Aluno_CPF",
                table: "Alunos",
                column: "CPF");

            migrationBuilder.CreateIndex(
                name: "IX_Aluno_Email",
                table: "Alunos",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Aluno_UsuarioId",
                table: "Alunos",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Alunos_Usuarios_UsuarioId",
                table: "Alunos",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alunos_Usuarios_UsuarioId",
                table: "Alunos");

            migrationBuilder.DropIndex(
                name: "IX_Aluno_CPF",
                table: "Alunos");

            migrationBuilder.DropIndex(
                name: "IX_Aluno_Email",
                table: "Alunos");

            migrationBuilder.DropIndex(
                name: "IX_Aluno_UsuarioId",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "UsuarioId",
                table: "Alunos");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "CPF",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
