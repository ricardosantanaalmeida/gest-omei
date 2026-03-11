using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestOmei.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Companies",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            // Certifica que empresas existentes fiquem ativas ao aplicar a migração.
            migrationBuilder.Sql("UPDATE \"Companies\" SET \"IsActive\" = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Companies");
        }
    }
}
