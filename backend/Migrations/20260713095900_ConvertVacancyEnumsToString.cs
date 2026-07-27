using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class ConvertVacancyEnumsToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
       name: "EmploymentType",
       table: "Vacancies",
       type: "nvarchar(max)",
       nullable: false,
       oldClrType: typeof(int),
       oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Vacancies",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "VacancyType",
                table: "Vacancies",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
            migrationBuilder.AlterColumn<string>(
               name: "DocumentType",
               table: "VacancyDocument",
               type: "nvarchar(max)",
               nullable: false,
               oldClrType: typeof(int),
               oldType: "int");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
