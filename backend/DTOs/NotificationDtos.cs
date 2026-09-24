using TalentHub.Models;

namespace TalentHub.DTOs
{
    public class NotificationResponse
    {
        public int NotificationId { get; set; }
        public string NotificationType { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime? SentAt { get; set; }
    }
    public class NotificationRequest
    {
        public int UserId { get; set; }
        public NotificationType Type { get; set; }
        public NotificationChannel? Channel { get; set; }
        public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
        public Dictionary<string, string> TemplateData { get; set; } = new();
        public DateTime? ScheduledAt { get; set; }
    }
    public class NotificationPreferenceResponse
    {
        public NotificationType? NotificationType { get; set; }   // null = global default
        public string Channel { get; set; } = string.Empty;
    }

    public class SetNotificationPreferenceRequest
    {
        public NotificationType? NotificationType { get; set; }   // null = set the global default
        public string Channel { get; set; } = string.Empty;       // "Email" or "InApp"
    }

    public class NotificationTemplateResponse
    {
        public int NotificationTemplateId { get; set; }
        public string NotificationType { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string BodyTemplate { get; set; } = string.Empty;
    }

    public class UpdateNotificationTemplateRequest
    {
        public string? Subject { get; set; }
        public string BodyTemplate { get; set; } = string.Empty;
    }

    public class CreateNotificationTemplateRequest
    {
        public string NotificationType { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string BodyTemplate { get; set; } = string.Empty;
    }
    public class AvailableCombinationResponse
    {
        public string NotificationType { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
    }
    public class UnreadCountResponse
    {
        public int UnreadCount { get; set; }
    }
}