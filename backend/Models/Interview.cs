using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum InterviewType
    {
        InPerson,
        Virtual,
    }

    public enum InterviewCategory
    {
       
        Technical,
        Behavioral,
        Panel,
        Managerial,
       
    }


    public enum InterviewStatus
    {
        Scheduled,
        Completed,
        Cancelled
    }

    public enum InterviewOutcome
    {
        Pending,
        Passed,
        Failed
    }

    [Table("Interviews")]
    public class Interview
    {
        [Key]
        public int InterviewId { get; set; }

        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }
        public Application? Application { get; set; }

        [Required]
        public int RoundNumber { get; set; }

        [Required]
        public InterviewType InterviewType { get; set; }

        [Required]
        public InterviewCategory InterviewCategory { get; set; }

        [Required]
        public DateTime ScheduledAt { get; set; }

        [MaxLength(300)]
        public string? Location { get; set; }

        [MaxLength(500)]
        public string? MeetingLink { get; set; }

        [Required]
        public InterviewStatus Status { get; set; } = InterviewStatus.Scheduled;

        public InterviewOutcome Outcome { get; set; } = InterviewOutcome.Pending;

        public string? RecruiterNotes { get; set; }

        [Required, ForeignKey(nameof(ScheduledByUser))]
        public int ScheduledByUserId { get; set; }
        public User? ScheduledByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}