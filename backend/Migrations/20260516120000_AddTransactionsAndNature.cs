using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestOmei.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionsAndNature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Adiciona coluna Nature ao plano de contas
            migrationBuilder.AddColumn<string>(
                name: "Nature",
                table: "AccountPlans",
                nullable: false,
                defaultValue: "Analítica");

            // Atualiza contas grupo existentes para Sintética
            migrationBuilder.Sql(
                "UPDATE AccountPlans SET Nature = 'Sintética' " +
                "WHERE Code IN ('1.0','2.0','2.1','2.2','2.3','2.4','2.5')");

            // Cria tabela de transações (movimentos)
            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("MySql:ValueGenerationStrategy", 2), // IdentityColumn
                    Date = table.Column<DateTime>(nullable: false),
                    Description = table.Column<string>(nullable: false, defaultValue: ""),
                    Amount = table.Column<decimal>(nullable: false),
                    Type = table.Column<int>(nullable: false),
                    Category = table.Column<string>(nullable: false, defaultValue: ""),
                    AccountPlanId = table.Column<int>(nullable: true),
                    AccountPlanCode = table.Column<string>(nullable: false, defaultValue: ""),
                    AccountPlanName = table.Column<string>(nullable: false, defaultValue: ""),
                    CompanyId = table.Column<int>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Transactions");

            migrationBuilder.DropColumn(
                name: "Nature",
                table: "AccountPlans");
        }
    }
}
