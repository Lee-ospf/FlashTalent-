using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class SeedInAppNotificationTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "NotificationTemplates",
                columns: new[] { "NotificationTemplateId", "BodyTemplate", "Channel", "IsActive", "NotificationType", "Subject" },
                values: new object[,]
                {
                    { 8, "An interview (Round {{RoundNumber}}) has been scheduled for {{ScheduledAt}} regarding your application to {{VacancyTitle}}.", "InApp", true, "InterviewScheduled", "Interview scheduled" },
                    { 9, "Your interview for {{VacancyTitle}} has been rescheduled to {{ScheduledAt}}.", "InApp", true, "InterviewRescheduled", "Interview rescheduled" },
                    { 10, "Your interview (Round {{RoundNumber}}) for {{VacancyTitle}} has been cancelled.", "InApp", true, "InterviewCancelled", "Interview cancelled" },
                    { 11, "An offer letter for {{JobTitle}} has been sent. Please review and respond by {{ClosingDate}}.", "InApp", true, "OfferSent", "Offer letter sent" },
                    { 12, "{{CandidateName}} has {{Status}} the offer for {{JobTitle}}.", "InApp", true, "OfferResponded", "Offer letter response" },
                    { 13, "A pre-screening form has been sent for your application to {{VacancyTitle}}. Please download, complete, and upload it.", "InApp", true, "PrescreeningSent", "Pre-screening form sent" },
                    { 14, "{{CandidateName}} submitted their pre-screening form for {{VacancyTitle}}.", "InApp", true, "PrescreeningSubmitted", "Pre-screening form submitted" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 14);
        }
    }
}
