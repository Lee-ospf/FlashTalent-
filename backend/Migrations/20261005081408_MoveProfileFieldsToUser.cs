using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class MoveProfileFieldsToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the new columns to Users
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Race",
                table: "Users",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "Users",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalEmail",
                table: "Users",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            // 2. Copy existing values across BEFORE the old columns are dropped.
            // Candidates first, then employees only where the user's value is still empty.
            migrationBuilder.Sql(@"
                UPDATE u
                SET u.Phone = c.Phone,
                    u.Gender = c.Gender,
                    u.Race = c.Race,
                    u.Nationality = c.Nationality,
                    u.DateOfBirth = c.DateOfBirth
                FROM Users u
                INNER JOIN Candidates c ON c.UserId = u.UserId;");

            migrationBuilder.Sql(@"
                UPDATE u
                SET u.Phone = COALESCE(u.Phone, e.Phone),
                    u.Gender = COALESCE(u.Gender, e.Gender),
                    u.Race = COALESCE(u.Race, e.Race),
                    u.Nationality = COALESCE(u.Nationality, e.Nationality),
                    u.DateOfBirth = COALESCE(u.DateOfBirth, e.DateOfBirth)
                FROM Users u
                INNER JOIN Employees e ON e.UserId = u.UserId;");

            // 3. Drop the old columns
            migrationBuilder.DropColumn(name: "DateOfBirth", table: "Employees");
            migrationBuilder.DropColumn(name: "Gender", table: "Employees");
            migrationBuilder.DropColumn(name: "Nationality", table: "Employees");
            migrationBuilder.DropColumn(name: "Phone", table: "Employees");
            migrationBuilder.DropColumn(name: "Race", table: "Employees");

            migrationBuilder.DropColumn(name: "DateOfBirth", table: "Candidates");
            migrationBuilder.DropColumn(name: "Gender", table: "Candidates");
            migrationBuilder.DropColumn(name: "Nationality", table: "Candidates");
            migrationBuilder.DropColumn(name: "Phone", table: "Candidates");
            migrationBuilder.DropColumn(name: "Race", table: "Candidates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Re-add the old columns
            migrationBuilder.AddColumn<DateTime>(name: "DateOfBirth", table: "Employees", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Gender", table: "Employees", type: "nvarchar(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Nationality", table: "Employees", type: "nvarchar(50)", maxLength: 50, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Phone", table: "Employees", type: "nvarchar(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Race", table: "Employees", type: "nvarchar(50)", maxLength: 50, nullable: true);

            migrationBuilder.AddColumn<DateTime>(name: "DateOfBirth", table: "Candidates", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Gender", table: "Candidates", type: "nvarchar(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Nationality", table: "Candidates", type: "nvarchar(50)", maxLength: 50, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Phone", table: "Candidates", type: "nvarchar(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(name: "Race", table: "Candidates", type: "nvarchar(50)", maxLength: 50, nullable: true);

            // 2. Copy the values back from Users
            migrationBuilder.Sql(@"
                UPDATE c
                SET c.Phone = u.Phone,
                    c.Gender = u.Gender,
                    c.Race = u.Race,
                    c.Nationality = u.Nationality,
                    c.DateOfBirth = u.DateOfBirth
                FROM Candidates c
                INNER JOIN Users u ON u.UserId = c.UserId;");

            migrationBuilder.Sql(@"
                UPDATE e
                SET e.Phone = u.Phone,
                    e.Gender = u.Gender,
                    e.Race = u.Race,
                    e.Nationality = u.Nationality,
                    e.DateOfBirth = u.DateOfBirth
                FROM Employees e
                INNER JOIN Users u ON u.UserId = e.UserId;");

            // 3. Remove the new columns from Users
            migrationBuilder.DropColumn(name: "DateOfBirth", table: "Users");
            migrationBuilder.DropColumn(name: "Gender", table: "Users");
            migrationBuilder.DropColumn(name: "Nationality", table: "Users");
            migrationBuilder.DropColumn(name: "PersonalEmail", table: "Users");
            migrationBuilder.DropColumn(name: "Phone", table: "Users");
            migrationBuilder.DropColumn(name: "Race", table: "Users");
        }
    }
}