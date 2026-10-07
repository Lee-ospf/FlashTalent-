using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // Mirrors CandidateSkill. Uses the shared Skills table and ProficiencyLevel enum.
    [Table("EmployeeSkills")]
    public class EmployeeSkill
    {
        [Key]
        public int EmployeeSkillId { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }

        public Employee? Employee { get; set; }

        [Required, ForeignKey(nameof(Skill))]
        public int SkillId { get; set; }

        public Skill? Skill { get; set; }

        [Required]
        public ProficiencyLevel ProficiencyLevel { get; set; } = ProficiencyLevel.Beginner;

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}