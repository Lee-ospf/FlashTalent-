using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // NOTE: MINIMAL STUB owned by Person A only, so Application.cs compiles.
    // Person B (Recruiter backend, D7) owns the full Interview table
    // (ScheduledByUserId, Location, MeetingLink, InterviewType, Status, etc).
    // Keep InterviewId and class name "Interview" identical when merging.
    [Table("Interviews")]
    public class Interview
    {
        [Key]
        public int InterviewId { get; set; }

        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }

        public Application? Application { get; set; }

        public DateTime ScheduledAt { get; set; }

        [MaxLength(300)]
        public string? Location { get; set; }

        [MaxLength(500)]
        public string? MeetingLink { get; set; }
    }
}