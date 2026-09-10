using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class FixInterviewRescheduleHistoryUserFk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewRescheduleHistory_Users_ChangedByUserId",
                table: "InterviewRescheduleHistory");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewRescheduleHistory_Users_ChangedByUserId",
                table: "InterviewRescheduleHistory",
                column: "ChangedByUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewRescheduleHistory_Users_ChangedByUserId",
                table: "InterviewRescheduleHistory");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewRescheduleHistory_Users_ChangedByUserId",
                table: "InterviewRescheduleHistory",
                column: "ChangedByUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
