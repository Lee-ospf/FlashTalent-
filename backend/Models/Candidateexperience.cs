using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("CandidateExperiences")]
    public class CandidateExperience
    {
        [Key]
        public int CandidateExperienceId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        [Required, MaxLength(200)]
        public string Company { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        // Null = currently working here (an open-ended role)
        public DateTime? EndDate { get; set; }

        // The "Projects and Duties" free-text column from the CV template
        public string? ProjectsAndDuties { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}