using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddPrescreeningTemplateAndInterviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Interviews_ApplicationId",
                table: "Interviews");

            migrationBuilder.RenameColumn(
                name: "ResponsesJson",
                table: "Prescreenings",
                newName: "Status");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "Prescreenings",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<string>(
                name: "CompletedFileUrl",
                table: "Prescreenings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletedOriginalFileName",
                table: "Prescreenings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SentAt",
                table: "Prescreenings",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Interviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Interviews",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "InterviewType",
                table: "Interviews",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Outcome",
                table: "Interviews",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RecruiterNotes",
                table: "Interviews",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoundNumber",
                table: "Interviews",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ScheduledByUserId",
                table: "Interviews",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Interviews",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PrescreeningTemplates",
                columns: table => new
                {
                    PrescreeningTemplateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "int", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescreeningTemplates", x => x.PrescreeningTemplateId);
                    table.ForeignKey(
                        name: "FK_PrescreeningTemplates_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicationId_RoundNumber",
                table: "Interviews",
                columns: new[] { "ApplicationId", "RoundNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ScheduledByUserId",
                table: "Interviews",
                column: "ScheduledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescreeningTemplates_UploadedByUserId",
                table: "PrescreeningTemplates",
                column: "UploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Interviews_Users_ScheduledByUserId",
                table: "Interviews",
                column: "ScheduledByUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Interviews_Users_ScheduledByUserId",
                table: "Interviews");

            migrationBuilder.DropTable(
                name: "PrescreeningTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Interviews_ApplicationId_RoundNumber",
                table: "Interviews");

            migrationBuilder.DropIndex(
                name: "IX_Interviews_ScheduledByUserId",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "CompletedFileUrl",
                table: "Prescreenings");

            migrationBuilder.DropColumn(
                name: "CompletedOriginalFileName",
                table: "Prescreenings");

            migrationBuilder.DropColumn(
                name: "SentAt",
                table: "Prescreenings");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "InterviewType",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "Outcome",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "RecruiterNotes",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "RoundNumber",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "ScheduledByUserId",
                table: "Interviews");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Interviews");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Prescreenings",
                newName: "ResponsesJson");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "Prescreenings",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicationId",
                table: "Interviews",
                column: "ApplicationId");
        }
    }
}
