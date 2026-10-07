using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

        // Phone, Gender, Race, Nationality and DateOfBirth now live on User.

        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public DateTime LastProfileUpdateAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<CandidateDocument> Documents { get; set; } = new List<CandidateDocument>();
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
        public ICollection<CandidateQualification> Qualifications { get; set; } = new List<CandidateQualification>();
        public ICollection<CandidateExperience> Experiences { get; set; } = new List<CandidateExperience>();
        public ICollection<Address> Addresses { get; set; } = new List<Address>();

        public TalentPool? TalentPoolEntry { get; set; }
    }
}