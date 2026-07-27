using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddQualificationLinkToDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QualificationId",
                table: "CandidateDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "VacancyChangeHistories",
                columns: table => new
                {
                    VacancyChangeHistoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VacancyId = table.Column<int>(type: "int", nullable: false),
                    VacancyTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ChangedByUserId = table.Column<int>(type: "int", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacancyChangeHistories", x => x.VacancyChangeHistoryId);
                    table.ForeignKey(
                        name: "FK_VacancyChangeHistories_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CandidateDocuments_QualificationId",
                table: "CandidateDocuments",
                column: "QualificationId");

            migrationBuilder.CreateIndex(
                name: "IX_VacancyChangeHistories_ChangedByUserId",
                table: "VacancyChangeHistories",
                column: "ChangedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_CandidateDocuments_CandidateQualifications_QualificationId",
                table: "CandidateDocuments",
                column: "QualificationId",
                principalTable: "CandidateQualifications",
                principalColumn: "CandidateQualificationId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CandidateDocuments_CandidateQualifications_QualificationId",
                table: "CandidateDocuments");

            migrationBuilder.DropTable(
                name: "VacancyChangeHistories");

            migrationBuilder.DropIndex(
                name: "IX_CandidateDocuments_QualificationId",
                table: "CandidateDocuments");

            migrationBuilder.DropColumn(
                name: "QualificationId",
                table: "CandidateDocuments");
        }
    }
}
