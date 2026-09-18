using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum NotificationType
    {
        InterviewScheduled,
        InterviewRescheduled,
        InterviewCancelled,
        StatusChanged,
        DocumentMissing,
        PrescreeningSent,
        PrescreeningSubmitted,
        OfferSent,
        OfferResponded,
        TalentPoolInvite,
        General
    }

    [Table("Notifications")]
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        [Required]
        public NotificationType NotificationType { get; set; }

        [Required, MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Body { get; set; } = string.Empty;
        [MaxLength(300)]
        public string? ActionUrl { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}