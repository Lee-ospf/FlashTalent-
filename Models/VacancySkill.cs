using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("VacancySkills")]
    public class VacancySkill
    {
        [Key]
        public int VacancyRequiredSkillId { get; set; }

        [ForeignKey(nameof(Vacancy))]
        public int VacancyId { get; set; }
        public Vacancy Vacancy { get; set; }

        [ForeignKey(nameof(Skill))]
        public int SkillId { get; set; }
        public Skill Skill { get; set; }

        public bool IsRequired { get; set; } = true;

        // e.g. Beginner / Intermediate / Advanced
        [MaxLength(50)]
        public string ProficiencyLevel { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
