using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestOmei.Api.Migrations
{
    public partial class AddAuditLogs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("MySql:ValueGenerationStrategy", 2),
                    Username   = table.Column<string>(nullable: false, defaultValue: ""),
                    Activity   = table.Column<string>(nullable: false, defaultValue: ""),
                    Entity     = table.Column<string>(nullable: false, defaultValue: ""),
                    EntityName = table.Column<string>(nullable: false, defaultValue: ""),
                    Company    = table.Column<string>(nullable: false, defaultValue: ""),
                    DateTime   = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AuditLogs");
        }
    }
}
