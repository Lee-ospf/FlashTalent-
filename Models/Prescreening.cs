using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
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

        // 1:1 with Application - a candidate fills this once per application,
        // only after being Shortlisted
        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }

        public Application? Application { get; set; }

        // Kept as a single text blob of question/answer pairs (JSON string) since
        // the scope doc doesn't define specific pre-screening questions yet.
        // Example: [{"question":"Notice period?","answer":"2 weeks"}]
        [Required]
        public string ResponsesJson { get; set; } = string.Empty;

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        // Recruiter-captured outcome (per scope doc: "Recruiter typing notes into a
        // form and saving them. No AI.")
        public PrescreeningOutcome Outcome { get; set; } = PrescreeningOutcome.Pending;

        public string? RecruiterNotes { get; set; }

        public DateTime? ReviewedAt { get; set; }
    }
}