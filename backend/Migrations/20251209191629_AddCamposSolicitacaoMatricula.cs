using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposSolicitacaoMatricula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bairro",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CEP",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CPF",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Celular",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NumeroCasa",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RG",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Rua",
                table: "SolicitacoesMatricula",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bairro",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "CEP",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "CPF",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "Celular",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "Cidade",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "Estado",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "NumeroCasa",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "RG",
                table: "SolicitacoesMatricula");

            migrationBuilder.DropColumn(
                name: "Rua",
                table: "SolicitacoesMatricula");
        }
    }
}
