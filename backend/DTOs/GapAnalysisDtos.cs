using TalentHub.Models;

namespace TalentHub.DTOs
{
    public enum GapStatus { Met, BelowLevel, Missing }

    public class SkillGapItem
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public ProficiencyLevel RequiredLevel { get; set; }
        public ProficiencyLevel? EmployeeLevel { get; set; }   // null when Missing
        public GapStatus Status { get; set; }
    }

    public class ExtraSkillItem
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public ProficiencyLevel Level { get; set; }
    }

    

    public class GapAnalysisResult
    {
        public List<SkillGapItem> Skills { get; set; } = new();
        public List<ExtraSkillItem> ExtraSkills { get; set; } = new();
       
        public int RequiredTotal { get; set; }
        public int RequiredMet { get; set; }
        public int NiceToHaveTotal { get; set; }
        public int NiceToHaveMet { get; set; }
        public bool MeetsAllRequiredSkills { get; set; }
    }
}