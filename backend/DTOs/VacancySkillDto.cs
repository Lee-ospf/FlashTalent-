using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class VacancySkillDto
    {
        public int SkillId { get; set; }
        public bool IsRequired { get; set; } = true;

        [MaxLength(50)]
        public string ProficiencyLevel { get; set; }
    }
}
