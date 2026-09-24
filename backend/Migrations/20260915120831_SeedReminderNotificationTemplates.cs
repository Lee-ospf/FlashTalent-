using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class SeedReminderNotificationTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "NotificationTemplates",
                columns: new[] { "NotificationTemplateId", "BodyTemplate", "Channel", "IsActive", "NotificationType", "Subject" },
                values: new object[,]
                {
                    { 15, "This is a reminder to complete and submit your pre-screening form for {{VacancyTitle}}.", "Email", true, "PrescreeningReminder", "Reminder: pre-screening form due" },
                    { 16, "This is a reminder to complete and submit your pre-screening form for {{VacancyTitle}}.", "InApp", true, "PrescreeningReminder", "Reminder: pre-screening form due" },
                    { 17, "This is a reminder that you have an interview for {{VacancyTitle}} scheduled for {{ScheduledAt}}.", "Email", true, "InterviewReminder", "Reminder: upcoming interview" },
                    { 18, "This is a reminder that you have an interview for {{VacancyTitle}} scheduled for {{ScheduledAt}}.", "InApp", true, "InterviewReminder", "Reminder: upcoming interview" },
                    { 19, "This is a reminder to respond to your offer for {{JobTitle}} before it closes on {{ClosingDate}}.", "Email", true, "OfferResponseReminder", "Reminder: offer response needed" },
                    { 20, "This is a reminder to respond to your offer for {{JobTitle}} before it closes on {{ClosingDate}}.", "InApp", true, "OfferResponseReminder", "Reminder: offer response needed" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 20);
        }
    }
}
