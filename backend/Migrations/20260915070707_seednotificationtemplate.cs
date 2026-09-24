using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class seednotificationtemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "NotificationTemplates",
                columns: new[] { "NotificationTemplateId", "BodyTemplate", "Channel", "IsActive", "NotificationType", "Subject" },
                values: new object[,]
                {
                    { 1, "An interview (Round {{RoundNumber}}) has been scheduled for {{ScheduledAt}} regarding your application to {{VacancyTitle}}.", "Email", true, "InterviewScheduled", "Interview scheduled" },
                    { 2, "Your interview for {{VacancyTitle}} has been rescheduled to {{ScheduledAt}}.", "Email", true, "InterviewRescheduled", "Interview rescheduled" },
                    { 3, "Your interview (Round {{RoundNumber}}) for {{VacancyTitle}} has been cancelled.", "Email", true, "InterviewCancelled", "Interview cancelled" },
                    { 4, "An offer letter for {{JobTitle}} has been sent. Please review and respond by {{ClosingDate}}.", "Email", true, "OfferSent", "Offer letter sent" },
                    { 5, "{{CandidateName}} has {{Status}} the offer for {{JobTitle}}.", "Email", true, "OfferResponded", "Offer letter response" },
                    { 6, "A pre-screening form has been sent for your application to {{VacancyTitle}}. Please download, complete, and upload it.", "Email", true, "PrescreeningSent", "Pre-screening form sent" },
                    { 7, "{{CandidateName}} submitted their pre-screening form for {{VacancyTitle}}.", "Email", true, "PrescreeningSubmitted", "Pre-screening form submitted" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "NotificationTemplates",
                keyColumn: "NotificationTemplateId",
                keyValue: 7);
        }
    }
}
