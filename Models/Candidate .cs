using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static System.Net.Mime.MediaTypeNames;

namespace TalentHub.Models
{
    [Table("Candidates")]
    public class Candidate
    {
        [Key]
        public int CandidateId { get; set; }

        // 1:1 with User - this is both the PK-linking FK and unique
        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? DateOfBirth { get; set; }

        // Free-text summary fields captured at registration (D2 in scope doc)
        // Skills/experience/qualifications kept simple as text for this deliverable -
        // no separate Skill table needed since AI matching is out of scope.
        public string? SkillsSummary { get; set; }

        public string? ExperienceSummary { get; set; }

        public string? QualificationsSummary { get; set; }

        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<CandidateDocument> Documents { get; set; } = new List<CandidateDocument>();
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
        public TalentPool? TalentPoolEntry { get; set; }
    }
}