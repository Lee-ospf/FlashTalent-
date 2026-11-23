using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddAdviceCourseDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CourseProvider",
                table: "SkillAdviceItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourseTitle",
                table: "SkillAdviceItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsGainedJson",
                table: "SkillAdviceItems",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CourseProvider",
                table: "SkillAdviceItems");

            migrationBuilder.DropColumn(
                name: "CourseTitle",
                table: "SkillAdviceItems");

            migrationBuilder.DropColumn(
                name: "SkillsGainedJson",
                table: "SkillAdviceItems");
        }
    }
}
