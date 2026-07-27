using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class SyncSnapshotAfterManualFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vacancies_Recruiters_CreatedByRecruiterId",
                table: "Vacancies");

            migrationBuilder.AddForeignKey(
                name: "FK_Vacancies_Recruiters_CreatedByRecruiterId",
                table: "Vacancies",
                column: "CreatedByRecruiterId",
                principalTable: "Recruiters",
                principalColumn: "RecruiterId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vacancies_Recruiters_CreatedByRecruiterId",
                table: "Vacancies");

            migrationBuilder.AddForeignKey(
                name: "FK_Vacancies_Recruiters_CreatedByRecruiterId",
                table: "Vacancies",
                column: "CreatedByRecruiterId",
                principalTable: "Recruiters",
                principalColumn: "RecruiterId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
