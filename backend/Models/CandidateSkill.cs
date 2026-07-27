using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum ProficiencyLevel
    {
        Beginner,
        Intermediate,
        Expert
    }

    [Table("CandidateSkills")]
    public class CandidateSkill
    {
        [Key]
        public int CandidateSkillId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        [Required, ForeignKey(nameof(Skill))]
        public int SkillId { get; set; }

        public Skill? Skill { get; set; }

        [Required]
        public ProficiencyLevel ProficiencyLevel { get; set; } = ProficiencyLevel.Beginner;

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}