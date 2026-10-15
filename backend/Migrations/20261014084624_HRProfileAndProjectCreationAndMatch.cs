using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class HRProfileAndProjectCreationAndMatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ProfileUpdatedAt",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HrProfiles",
                columns: table => new
                {
                    HrProfileId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrProfiles", x => x.HrProfileId);
                    table.ForeignKey(
                        name: "FK_HrProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    ProjectId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RequiredQualifications = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastMatchedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.ProjectId);
                    table.ForeignKey(
                        name: "FK_Projects_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectMatches",
                columns: table => new
                {
                    ProjectMatchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<int>(type: "int", nullable: false),
                    Reasoning = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GapDetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsDismissed = table.Column<bool>(type: "bit", nullable: false),
                    DismissedByUserId = table.Column<int>(type: "int", nullable: true),
                    DismissedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ComputedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMatches", x => x.ProjectMatchId);
                    table.ForeignKey(
                        name: "FK_ProjectMatches_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMatches_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMatches_Users_DismissedByUserId",
                        column: x => x.DismissedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectMembers",
                columns: table => new
                {
                    ProjectMemberId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    AddedByUserId = table.Column<int>(type: "int", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMembers", x => x.ProjectMemberId);
                    table.ForeignKey(
                        name: "FK_ProjectMembers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectMembers_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMembers_Users_AddedByUserId",
                        column: x => x.AddedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectSkills",
                columns: table => new
                {
                    ProjectSkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    MinimumLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectSkills", x => x.ProjectSkillId);
                    table.ForeignKey(
                        name: "FK_ProjectSkills_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "NotificationTemplates",
                columns: new[] { "NotificationTemplateId", "BodyTemplate", "Channel", "IsActive", "NotificationType", "Subject" },
                values: new object[,]
                {
                    { 21, "You have been added to the project {{ProjectName}} by HR.", "Email", true, "AddedToProject", "You've been added to a project" },
                    { 22, "You have been added to the project {{ProjectName}} by HR.", "InApp", true, "AddedToProject", "You've been added to a project" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_HrProfiles_UserId",
                table: "HrProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMatches_DismissedByUserId",
                table: "ProjectMatches",
                column: "DismissedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMatches_EmployeeId",
                table: "ProjectMatches",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMatches_ProjectId_EmployeeId",
                table: "ProjectMatches",
                columns: new[] { "ProjectId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_AddedByUserId",
                table: "ProjectMembers",
                column: "AddedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_EmployeeId",
                table: "ProjectMembers",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_ProjectId_EmployeeId",
                table: "ProjectMembers",
                columns: new[] { "ProjectId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CreatedByUserId",
                table: "Projects",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSkills_ProjectId_SkillId",
                table: "ProjectSkills",
                columns: new[] { "ProjectId", "SkillId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSkills_SkillId",
                table: "ProjectSkills",
                column: "SkillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HrProfiles");

            migrationBuilder.DropTable(
                name: "ProjectMatches");

            migrationBuilder.DropTable(
                name: "ProjectMembers");

            migrationBuilder.DropTable(
                name: "ProjectSkills");

            migrationBuilder.DropTable(
                name: "Projects");
                
            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 22);

            migrationBuilder.DropColumn(
                name: "ProfileUpdatedAt",
                table: "Employees");
        }
    }
}
