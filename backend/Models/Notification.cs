using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum NotificationType
    {
        InterviewScheduled,
        InterviewRescheduled,
        InterviewCancelled,
        InterviewReminder,
        StatusChanged,
        DocumentMissing,
        PrescreeningSent,
        PrescreeningSubmitted,
        PrescreeningReminder,
        OfferSent,       
        OfferResponded,
        OfferResponseReminder,
        TalentPoolInvite,
        General
    }

    public enum NotificationChannel
    {
        Email,
        InApp,
        Both,
        None
    }

    public enum NotificationPriority
    {
        Normal,
        High,
        Critical  
    }

    public enum DeliveryStatus
    {
        Pending,
        Sent,
        Failed,
        Skipped   
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
        [Required] 
        public NotificationChannel Channel { get; set; }
        [Required] 
        public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
        [Required] public DeliveryStatus Status { get; set; } = DeliveryStatus.Pending;


        [Required, MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Body { get; set; } = string.Empty;
        [MaxLength(300)]
        public string? ActionUrl { get; set; }

        public bool IsRead { get; set; } = false;
        public int AttemptCount { get; set; } = 0;
        public string? ErrorMessage { get; set; }

        public DateTime? ScheduledAt { get; set; }   // null = send immediately
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SentAt { get; set; }         // when actually dispatched, not when queued
    }
}