using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposEnderecoAlunoESolicitacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bairro",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CEP",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CPF",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Celular",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NumeroCasa",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RG",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Rua",
                table: "Alunos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bairro",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "CEP",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "CPF",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "Celular",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "Cidade",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "Estado",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "NumeroCasa",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "RG",
                table: "Alunos");

            migrationBuilder.DropColumn(
                name: "Rua",
                table: "Alunos");
        }
    }
}
