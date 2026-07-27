using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class ReconcileSnapshotAfterMerge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------- Step 1: Create tables with no dependencies first ----------
            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    ClientId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ContactPerson = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ContactPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.ClientId);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.DepartmentId);
                });

            migrationBuilder.CreateTable(
                name: "Recruiters",
                columns: table => new
                {
                    RecruiterId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recruiters", x => x.RecruiterId);
                    table.ForeignKey(
                        name: "FK_Recruiters_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Recruiters_UserId",
                table: "Recruiters",
                column: "UserId",
                unique: true);

            // ---------- Step 2: Fix Vacancies table - remove the old stub column, add all real columns ----------
            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Vacancies");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Vacancies",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "VacancyType",
                table: "Vacancies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "Vacancies",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientId",
                table: "Vacancies",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmploymentType",
                table: "Vacancies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "SalaryMin",
                table: "Vacancies",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SalaryMax",
                table: "Vacancies",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Vacancies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosingDate",
                table: "Vacancies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinYearsExperience",
                table: "Vacancies",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredQualifications",
                table: "Vacancies",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Requirements",
                table: "Vacancies",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Vacancies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Vacancies",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1900, 1, 1));

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "Vacancies",
                type: "datetime2",
                nullable: true);

            // Temporary default of 0 so existing rows (if any) don't block the NOT NULL
            // constraint - if you have real Vacancy rows already, you'll need to manually
            // assign them a real RecruiterId afterward via SSMS, since 0 won't match any
            // real Recruiter.
            migrationBuilder.AddColumn<int>(
                name: "CreatedByRecruiterId",
                table: "Vacancies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // ---------- Step 3: Now create tables that depend on Vacancies having the right columns ----------
            migrationBuilder.CreateTable(
                name: "VacancyDocument",
                columns: table => new
                {
                    VacancyDocumentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VacancyId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<int>(type: "int", nullable: false),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacancyDocument", x => x.VacancyDocumentId);
                    table.ForeignKey(
                        name: "FK_VacancyDocument_Vacancies_VacancyId",
                        column: x => x.VacancyId,
                        principalTable: "Vacancies",
                        principalColumn: "VacancyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VacancyDocument_VacancyId",
                table: "VacancyDocument",
                column: "VacancyId");

            migrationBuilder.CreateTable(
                name: "VacancySkills",
                columns: table => new
                {
                    VacancyRequiredSkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VacancyId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    ProficiencyLevel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacancySkills", x => x.VacancyRequiredSkillId);
                    table.ForeignKey(
                        name: "FK_VacancySkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VacancySkills_Vacancies_VacancyId",
                        column: x => x.VacancyId,
                        principalTable: "Vacancies",
                        principalColumn: "VacancyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VacancySkills_SkillId",
                table: "VacancySkills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_VacancySkills_VacancyId",
                table: "VacancySkills",
                column: "VacancyId");

            // ---------- Step 4: Add indexes and FKs on Vacancies now that Clients/Departments/Recruiters exist ----------
            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_ClientId",
                table: "Vacancies",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_CreatedByRecruiterId",
                table: "Vacancies",
                column: "CreatedByRecruiterId");

            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_DepartmentId",
                table: "Vacancies",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vacancies_Clients_ClientId",
                table: "Vacancies",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "ClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vacancies_Departments_DepartmentId",
                table: "Vacancies",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId");

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
                name: "FK_Vacancies_Clients_ClientId",
                table: "Vacancies");

            migrationBuilder.DropForeignKey(
                name: "FK_Vacancies_Departments_DepartmentId",
                table: "Vacancies");

            migrationBuilder.DropForeignKey(
                name: "FK_Vacancies_Recruiters_CreatedByRecruiterId",
                table: "Vacancies");

            migrationBuilder.DropTable(
                name: "VacancyDocument");

            migrationBuilder.DropTable(
                name: "VacancySkills");

            migrationBuilder.DropTable(
                name: "Clients");

            migrationBuilder.DropTable(
                name: "Departments");

            migrationBuilder.DropTable(
                name: "Recruiters");

            migrationBuilder.DropColumn(name: "Description", table: "Vacancies");
            migrationBuilder.DropColumn(name: "VacancyType", table: "Vacancies");
            migrationBuilder.DropColumn(name: "DepartmentId", table: "Vacancies");
            migrationBuilder.DropColumn(name: "ClientId", table: "Vacancies");
            migrationBuilder.DropColumn(name: "EmploymentType", table: "Vacancies");
            migrationBuilder.DropColumn(name: "SalaryMin", table: "Vacancies");
            migrationBuilder.DropColumn(name: "SalaryMax", table: "Vacancies");
            migrationBuilder.DropColumn(name: "Location", table: "Vacancies");
            migrationBuilder.DropColumn(name: "ClosingDate", table: "Vacancies");
            migrationBuilder.DropColumn(name: "MinYearsExperience", table: "Vacancies");
            migrationBuilder.DropColumn(name: "RequiredQualifications", table: "Vacancies");
            migrationBuilder.DropColumn(name: "Requirements", table: "Vacancies");
            migrationBuilder.DropColumn(name: "Status", table: "Vacancies");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Vacancies");
            migrationBuilder.DropColumn(name: "PublishedAt", table: "Vacancies");
            migrationBuilder.DropColumn(name: "CreatedByRecruiterId", table: "Vacancies");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Vacancies",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}