using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddTalentPoolMatchAndVacancyScoreTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastApplicantRankedAt",
                table: "Vacancies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPoolPulledAt",
                table: "Vacancies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TalentPoolMatches",
                columns: table => new
                {
                    TalentPoolMatchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VacancyId = table.Column<int>(type: "int", nullable: false),
                    CandidateId = table.Column<int>(type: "int", nullable: false),
                    Stage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Score = table.Column<int>(type: "int", nullable: false),
                    Reasoning = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InvitedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ComputedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TalentPoolMatches", x => x.TalentPoolMatchId);
                    table.ForeignKey(
                        name: "FK_TalentPoolMatches_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "CandidateId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TalentPoolMatches_Vacancies_VacancyId",
                        column: x => x.VacancyId,
                        principalTable: "Vacancies",
                        principalColumn: "VacancyId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TalentPoolMatches_CandidateId",
                table: "TalentPoolMatches",
                column: "CandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_TalentPoolMatches_VacancyId_Stage",
                table: "TalentPoolMatches",
                columns: new[] { "VacancyId", "Stage" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TalentPoolMatches");

            migrationBuilder.DropColumn(
                name: "LastApplicantRankedAt",
                table: "Vacancies");

            migrationBuilder.DropColumn(
                name: "LastPoolPulledAt",
                table: "Vacancies");
        }
    }
}
