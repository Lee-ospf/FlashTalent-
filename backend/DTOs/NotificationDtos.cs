namespace TalentHub.DTOs
{
    public class NotificationResponse
    {
        public int NotificationId { get; set; }
        public string NotificationType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class UnreadCountResponse
    {
        public int UnreadCount { get; set; }
    }
}