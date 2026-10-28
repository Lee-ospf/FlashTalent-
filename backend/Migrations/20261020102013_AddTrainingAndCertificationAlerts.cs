using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingAndCertificationAlerts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CertificationReminderLogs",
                columns: table => new
                {
                    CertificationReminderLogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeQualificationId = table.Column<int>(type: "int", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "date", nullable: false),
                    ReminderPoint = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    WasSent = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificationReminderLogs", x => x.CertificationReminderLogId);
                    table.ForeignKey(
                        name: "FK_CertificationReminderLogs_EmployeeQualifications_EmployeeQualificationId",
                        column: x => x.EmployeeQualificationId,
                        principalTable: "EmployeeQualifications",
                        principalColumn: "EmployeeQualificationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrainingProgrammes",
                columns: table => new
                {
                    TrainingProgrammeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Provider = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DurationHours = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingProgrammes", x => x.TrainingProgrammeId);
                    table.ForeignKey(
                        name: "FK_TrainingProgrammes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TrainingIntakes",
                columns: table => new
                {
                    TrainingIntakeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainingProgrammeId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateTime>(type: "date", nullable: false),
                    EndDate = table.Column<DateTime>(type: "date", nullable: false),
                    MaxParticipants = table.Column<int>(type: "int", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ClosedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingIntakes", x => x.TrainingIntakeId);
                    table.ForeignKey(
                        name: "FK_TrainingIntakes_TrainingProgrammes_TrainingProgrammeId",
                        column: x => x.TrainingProgrammeId,
                        principalTable: "TrainingProgrammes",
                        principalColumn: "TrainingProgrammeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingIntakes_Users_ClosedByUserId",
                        column: x => x.ClosedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingIntakes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TrainingProgrammeSkills",
                columns: table => new
                {
                    TrainingProgrammeSkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainingProgrammeId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingProgrammeSkills", x => x.TrainingProgrammeSkillId);
                    table.ForeignKey(
                        name: "FK_TrainingProgrammeSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingProgrammeSkills_TrainingProgrammes_TrainingProgrammeId",
                        column: x => x.TrainingProgrammeId,
                        principalTable: "TrainingProgrammes",
                        principalColumn: "TrainingProgrammeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrainingAssignments",
                columns: table => new
                {
                    TrainingAssignmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainingIntakeId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ProgressPercent = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "date", nullable: false),
                    AssignedByUserId = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConfirmedByUserId = table.Column<int>(type: "int", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NotCompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReminderSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingAssignments", x => x.TrainingAssignmentId);
                    table.ForeignKey(
                        name: "FK_TrainingAssignments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAssignments_TrainingIntakes_TrainingIntakeId",
                        column: x => x.TrainingIntakeId,
                        principalTable: "TrainingIntakes",
                        principalColumn: "TrainingIntakeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAssignments_Users_AssignedByUserId",
                        column: x => x.AssignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAssignments_Users_ConfirmedByUserId",
                        column: x => x.ConfirmedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeQualifications_ExpiryDate",
                table: "EmployeeQualifications",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_CertificationReminderLogs_EmployeeQualificationId_ExpiryDate_ReminderPoint",
                table: "CertificationReminderLogs",
                columns: new[] { "EmployeeQualificationId", "ExpiryDate", "ReminderPoint" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAssignments_AssignedByUserId",
                table: "TrainingAssignments",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAssignments_ConfirmedByUserId",
                table: "TrainingAssignments",
                column: "ConfirmedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAssignments_EmployeeId_Status",
                table: "TrainingAssignments",
                columns: new[] { "EmployeeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAssignments_Status_DueDate",
                table: "TrainingAssignments",
                columns: new[] { "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAssignments_TrainingIntakeId_EmployeeId",
                table: "TrainingAssignments",
                columns: new[] { "TrainingIntakeId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrainingIntakes_ClosedByUserId",
                table: "TrainingIntakes",
                column: "ClosedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingIntakes_CreatedByUserId",
                table: "TrainingIntakes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingIntakes_TrainingProgrammeId_StartDate",
                table: "TrainingIntakes",
                columns: new[] { "TrainingProgrammeId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingProgrammes_CreatedByUserId",
                table: "TrainingProgrammes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingProgrammeSkills_SkillId",
                table: "TrainingProgrammeSkills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingProgrammeSkills_TrainingProgrammeId_SkillId",
                table: "TrainingProgrammeSkills",
                columns: new[] { "TrainingProgrammeId", "SkillId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CertificationReminderLogs");

            migrationBuilder.DropTable(
                name: "TrainingAssignments");

            migrationBuilder.DropTable(
                name: "TrainingProgrammeSkills");

            migrationBuilder.DropTable(
                name: "TrainingIntakes");

            migrationBuilder.DropTable(
                name: "TrainingProgrammes");

            migrationBuilder.DropIndex(
                name: "IX_EmployeeQualifications_ExpiryDate",
                table: "EmployeeQualifications");
        }
    }
}
