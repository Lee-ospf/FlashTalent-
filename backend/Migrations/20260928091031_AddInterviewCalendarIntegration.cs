using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewCalendarIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CalendarEventId", table: "Interviews",
                type: "nvarchar(max)", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CalendarIntegrationError", table: "Interviews",
                type: "nvarchar(max)", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CalendarIntegrationStatus", table: "Interviews",
                type: "nvarchar(max)", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CalendarProvider", table: "Interviews",
                type: "nvarchar(max)", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes", table: "Interviews",
                type: "int", nullable: false, defaultValue: 60);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CalendarEventId", table: "Interviews");
            migrationBuilder.DropColumn(name: "CalendarIntegrationError", table: "Interviews");
            migrationBuilder.DropColumn(name: "CalendarIntegrationStatus", table: "Interviews");
            migrationBuilder.DropColumn(name: "CalendarProvider", table: "Interviews");
            migrationBuilder.DropColumn(name: "DurationMinutes", table: "Interviews");
        }
    }
}
