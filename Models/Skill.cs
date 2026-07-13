using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{

    public enum SkillCategory
    {
        Technical,
        SoftSkill
    }

    [Table("Skills")]
    public class Skill
    {
        [Key]
        public int SkillId { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // e.g. "Technical", "Soft Skills", "Languages" - free text for now so
        // Admin isn't locked into a fixed category enum; can tighten to an enum
        // later if the category list stabilizes.
        [Required]
        public SkillCategory Category { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
    }
}
