using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum PrescreeningStatus
    {
        Sent,
        Submitted,
        Reviewed
    }

    public enum PrescreeningOutcome
    {
        Pending,
        Passed,
        Failed
    }

    [Table("Prescreenings")]
    public class Prescreening
    {
        [Key]
        public int PrescreeningId { get; set; }

        // 1:1 with Application - unique index already enforced in AppDbContext
        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }
        public Application? Application { get; set; }

        [Required]
        public PrescreeningStatus Status { get; set; } = PrescreeningStatus.Sent;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Candidate's uploaded completed form
        public string? CompletedFileUrl { get; set; }
        public string? CompletedOriginalFileName { get; set; }
        public DateTime? SubmittedAt { get; set; }

        // Recruiter review
        public PrescreeningOutcome Outcome { get; set; } = PrescreeningOutcome.Pending;
        public string? RecruiterNotes { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }
}