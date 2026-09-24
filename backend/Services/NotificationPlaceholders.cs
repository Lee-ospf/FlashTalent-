using TalentHub.Models;

namespace TalentHub.Services
{
    public static class NotificationPlaceholders
    {
        // Keep in sync with the TemplateData keys each controller actually
        // passes into INotificationService.Build() — nothing enforces this
        // automatically, so update this alongside any TemplateData change.
        public static readonly Dictionary<NotificationType, string[]> ByType = new()
        {
            [NotificationType.InterviewScheduled] = new[] { "RoundNumber", "ScheduledAt", "VacancyTitle" },
            [NotificationType.InterviewRescheduled] = new[] { "VacancyTitle", "ScheduledAt" },
            [NotificationType.InterviewCancelled] = new[] { "RoundNumber", "VacancyTitle" },
            [NotificationType.InterviewReminder] = new[] { "VacancyTitle", "ScheduledAt" },
            [NotificationType.PrescreeningSent] = new[] { "VacancyTitle" },
            [NotificationType.PrescreeningSubmitted] = new[] { "CandidateName", "VacancyTitle" },
            [NotificationType.PrescreeningReminder] = new[] { "VacancyTitle" },
            [NotificationType.OfferSent] = new[] { "JobTitle", "ClosingDate" },
            [NotificationType.OfferResponded] = new[] { "CandidateName", "JobTitle", "Status" },
            [NotificationType.OfferResponseReminder] = new[] { "JobTitle", "ClosingDate" },
            [NotificationType.StatusChanged] = Array.Empty<string>(),
            [NotificationType.DocumentMissing] = Array.Empty<string>(),
            [NotificationType.General] = Array.Empty<string>(),
        };
    }
}
