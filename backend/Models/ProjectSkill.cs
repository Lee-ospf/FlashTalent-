using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("ProjectSkills")]
    public class ProjectSkill
    {
        [Key]
        public int ProjectSkillId { get; set; }

        [ForeignKey(nameof(Project))]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [ForeignKey(nameof(Skill))]
        public int SkillId { get; set; }
        public Skill? Skill { get; set; }

        // Required vs nice-to-have
        public bool IsRequired { get; set; } = true;

        // Same enum as EmployeeSkill so levels can be compared directly.
        // CHANGE the type name if your EmployeeSkill enum is called something else.
        public ProficiencyLevel MinimumLevel { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}