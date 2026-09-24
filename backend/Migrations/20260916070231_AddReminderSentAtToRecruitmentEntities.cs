using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderSentAtToRecruitmentEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReminderSentAt",
                table: "Prescreenings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReminderSentAt",
                table: "OfferLetters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReminderSentAt",
                table: "Interviews",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReminderSentAt",
                table: "Prescreenings");

            migrationBuilder.DropColumn(
                name: "ReminderSentAt",
                table: "OfferLetters");

            migrationBuilder.DropColumn(
                name: "ReminderSentAt",
                table: "Interviews");
        }
    }
}
