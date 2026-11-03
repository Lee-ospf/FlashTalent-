using TalentHub.Models;

namespace TalentHub.DTOs
{
    // A run of a programme HR could place the employee in today
    public class SuggestionIntakeResponse
    {
        public int TrainingIntakeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // null = no maximum
        public int? SpotsLeft { get; set; }
    }

    // A real course from the training catalogue, with its availability as of now
    public class SuggestionProgrammeResponse
    {
        public int TrainingProgrammeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }

        // false = retired since the advice was written
        public bool IsActive { get; set; }

        // null = nothing open: HR needs to schedule an intake
        public SuggestionIntakeResponse? NextOpenIntake { get; set; }
    }

    // One step of the learning path
    public class SuggestionItemResponse
    {
        // The id used by PATCH api/skill-advice-items/{id}/status
        public int SkillSuggestionItemId { get; set; }
        public int SortOrder { get; set; }

        // null = a skill the system doesn't have (shown as plain text)
        public int? SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public ProficiencyLevel? TargetLevel { get; set; }

        public string Advice { get; set; } = string.Empty;
        public SuggestionItemStatus Status { get; set; }

        // A real catalogue course, or null
        public SuggestionProgrammeResponse? Programme { get; set; }

        // true if the employee already has unfinished training of that programme
        public bool IsAlreadyAssigned { get; set; }

        // An idea from outside the catalogue. Show it as "AI suggestion, not verified"; it is never a link.
        public string? ExternalIdea { get; set; }
    }

    public class SkillSuggestionResponse
    {
        public int SkillSuggestionId { get; set; }
        public SuggestionSource Source { get; set; }
        public int EmployeeId { get; set; }
        public int? CareerGoalId { get; set; }
        public int? ProjectId { get; set; }

        public string? Summary { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string? ModelVersion { get; set; }

        // true = the skills, goal, project or catalogue changed since this was written
        public bool IsStale { get; set; }

        // How many more times advice can be generated for this employee in the next 24 hours
        public int GenerationsLeft { get; set; }

        public List<SuggestionItemResponse> Items { get; set; } = new();
    }

    // The code-only view of a project gap (no AI involved)
    public class ProjectGapResponse
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int EmployeeId { get; set; }
        public GapAnalysisResult Gaps { get; set; } = new();
    }

    // Used by HR (project suggestions) and by the employee (their own goal suggestions)
    public class UpdateSuggestionItemStatusRequest
    {
        public SuggestionItemStatus Status { get; set; }
    }
}