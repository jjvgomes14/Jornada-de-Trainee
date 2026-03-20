using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    public partial class AddArquivosECursoNaSolicitacaoMatricula2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'CursoDesejado') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [CursoDesejado] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoNomeArquivo') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [ComprovanteEnderecoNomeArquivo] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoContentType') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [ComprovanteEnderecoContentType] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoBase64') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [ComprovanteEnderecoBase64] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarNomeArquivo') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [HistoricoEscolarNomeArquivo] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarContentType') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [HistoricoEscolarContentType] nvarchar(max) NOT NULL DEFAULT N'';
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarBase64') IS NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula]
    ADD [HistoricoEscolarBase64] nvarchar(max) NOT NULL DEFAULT N'';
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'CursoDesejado') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [CursoDesejado];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoNomeArquivo') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [ComprovanteEnderecoNomeArquivo];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoContentType') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [ComprovanteEnderecoContentType];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'ComprovanteEnderecoBase64') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [ComprovanteEnderecoBase64];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarNomeArquivo') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [HistoricoEscolarNomeArquivo];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarContentType') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [HistoricoEscolarContentType];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('SolicitacoesMatricula', 'HistoricoEscolarBase64') IS NOT NULL
BEGIN
    ALTER TABLE [SolicitacoesMatricula] DROP COLUMN [HistoricoEscolarBase64];
END
");
        }
    }
}