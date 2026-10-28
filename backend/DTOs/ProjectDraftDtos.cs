using TalentHub.Models;

namespace TalentHub.DTOs
{
    public class DraftSkill
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public ProficiencyLevel MinimumLevel { get; set; }
    }

    public class SkillSuggestion
    {
        public int SkillId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class UnmatchedDraftSkill
    {
        public string ExtractedName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public ProficiencyLevel MinimumLevel { get; set; }
        public List<SkillSuggestion> Suggestions { get; set; } = new();
    }

    // A draft only. Nothing here is saved until HR reviews it and creates the project.
    public class ProjectDraftResponse
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string RequiredQualifications { get; set; } = string.Empty;
        public List<DraftSkill> Skills { get; set; } = new();
        public List<UnmatchedDraftSkill> UnmatchedSkills { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }
}