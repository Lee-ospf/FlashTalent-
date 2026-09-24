using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class AddedNotificationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "SentAt",
                table: "Notifications",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<int>(
                name: "AttemptCount",
                table: "Notifications",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Notifications",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "ErrorMessage",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledAt",
                table: "Notifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    NotificationTemplateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NotificationType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BodyTemplate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.NotificationTemplateId);
                });

            migrationBuilder.CreateTable(
                name: "UserNotificationPreferences",
                columns: table => new
                {
                    UserNotificationPreferenceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    NotificationType = table.Column<int>(type: "int", nullable: true),
                    Channel = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotificationPreferences", x => x.UserNotificationPreferenceId);
                    table.ForeignKey(
                        name: "FK_UserNotificationPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationTemplates_NotificationType_Channel",
                table: "NotificationTemplates",
                columns: new[] { "NotificationType", "Channel" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserNotificationPreferences_UserId",
                table: "UserNotificationPreferences",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationTemplates");

            migrationBuilder.DropTable(
                name: "UserNotificationPreferences");

            migrationBuilder.DropColumn(
                name: "AttemptCount",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ErrorMessage",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ScheduledAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Notifications");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SentAt",
                table: "Notifications",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
    name: "Channel",
    table: "Notifications",
    type: "nvarchar(max)",
    nullable: false,
    defaultValue: "InApp");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Normal");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Sent");
        }

    }
}
