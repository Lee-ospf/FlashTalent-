namespace TalentHub.DTOs
{
    // What the frontend receives after uploading a CV for AI parsing.
    // Shaped close to CreateExperienceRequest / CreateQualificationRequest so
    // mapping on the frontend is close to 1:1, but kept as its own DTO since
    // this is AI-guessed, unsaved data — not yet validated the way a real
    // Create*Request would be by the time it reaches those endpoints.
    public class ParsedResumeResponse
    {
        public string? Phone { get; set; }
        public List<ParsedSkillDto> Skills { get; set; } = new();
        public List<ParsedQualificationDto> Qualifications { get; set; } = new();
        public List<ParsedExperienceDto> Experiences { get; set; } = new();
    }

    public class ParsedSkillDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }              // "Technical" | "Soft" — AI's best guess
        public string ProficiencyLevel { get; set; } = "Intermediate"; // AI's best guess; candidate can correct
    }

    public class ParsedQualificationDto
    {
        public string QualificationType { get; set; } = "Education"; // "Education" | "Certification"
        public string Name { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public string? YearCompleted { get; set; }          // ISO date string, or null if the AI genuinely couldn't tell
    }

    public class ParsedExperienceDto
    {
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? StartDate { get; set; }               // ISO date string, or null if unclear
        public string? EndDate { get; set; }                  // null = current role
        public string? ProjectsAndDuties { get; set; }
    }
}