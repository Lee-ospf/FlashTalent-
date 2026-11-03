using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddCareerPlanning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CareerGoals",
                columns: table => new
                {
                    CareerGoalId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    TargetRole = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TargetDate = table.Column<DateTime>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ShareWithHr = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CareerGoals", x => x.CareerGoalId);
                    table.ForeignKey(
                        name: "FK_CareerGoals_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SkillAdviceRuns",
                columns: table => new
                {
                    SkillAdviceRunId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillAdviceRuns", x => x.SkillAdviceRunId);
                    table.ForeignKey(
                        name: "FK_SkillAdviceRuns_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SkillAdviceRuns_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SkillAdvices",
                columns: table => new
                {
                    SkillAdviceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CareerGoalId = table.Column<int>(type: "int", nullable: true),
                    ProjectId = table.Column<int>(type: "int", nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    InputFingerprint = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GeneratedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillAdvices", x => x.SkillAdviceId);
                    table.CheckConstraint("CK_SkillAdvices_OneSubject", "([CareerGoalId] IS NOT NULL AND [ProjectId] IS NULL) OR ([CareerGoalId] IS NULL AND [ProjectId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_SkillAdvices_CareerGoals_CareerGoalId",
                        column: x => x.CareerGoalId,
                        principalTable: "CareerGoals",
                        principalColumn: "CareerGoalId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SkillAdvices_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SkillAdvices_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SkillAdvices_Users_GeneratedByUserId",
                        column: x => x.GeneratedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SkillAdviceItems",
                columns: table => new
                {
                    SkillAdviceItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SkillAdviceId = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: true),
                    SkillName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TargetLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    AdviceText = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    TrainingProgrammeId = table.Column<int>(type: "int", nullable: true),
                    ExternalIdea = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StatusChangedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillAdviceItems", x => x.SkillAdviceItemId);
                    table.ForeignKey(
                        name: "FK_SkillAdviceItems_SkillAdvices_SkillAdviceId",
                        column: x => x.SkillAdviceId,
                        principalTable: "SkillAdvices",
                        principalColumn: "SkillAdviceId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SkillAdviceItems_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SkillAdviceItems_TrainingProgrammes_TrainingProgrammeId",
                        column: x => x.TrainingProgrammeId,
                        principalTable: "TrainingProgrammes",
                        principalColumn: "TrainingProgrammeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CareerGoals_EmployeeId_Status",
                table: "CareerGoals",
                columns: new[] { "EmployeeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CareerGoals_Status_ShareWithHr",
                table: "CareerGoals",
                columns: new[] { "Status", "ShareWithHr" });

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdviceItems_SkillAdviceId_SortOrder",
                table: "SkillAdviceItems",
                columns: new[] { "SkillAdviceId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdviceItems_SkillId",
                table: "SkillAdviceItems",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdviceItems_TrainingProgrammeId",
                table: "SkillAdviceItems",
                column: "TrainingProgrammeId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdviceRuns_EmployeeId_RequestedAt",
                table: "SkillAdviceRuns",
                columns: new[] { "EmployeeId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdviceRuns_RequestedByUserId",
                table: "SkillAdviceRuns",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdvices_CareerGoalId",
                table: "SkillAdvices",
                column: "CareerGoalId",
                unique: true,
                filter: "[CareerGoalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdvices_EmployeeId",
                table: "SkillAdvices",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdvices_GeneratedByUserId",
                table: "SkillAdvices",
                column: "GeneratedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillAdvices_ProjectId_EmployeeId",
                table: "SkillAdvices",
                columns: new[] { "ProjectId", "EmployeeId" },
                unique: true,
                filter: "[ProjectId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SkillAdviceItems");

            migrationBuilder.DropTable(
                name: "SkillAdviceRuns");

            migrationBuilder.DropTable(
                name: "SkillAdvices");

            migrationBuilder.DropTable(
                name: "CareerGoals");
        }
    }
}
