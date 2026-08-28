using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class VacancySkillDto
    {
        public int SkillId { get; set; }
        public bool IsRequired { get; set; } = true;
        public string SkillName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string ProficiencyLevel { get; set; }
    }
}
