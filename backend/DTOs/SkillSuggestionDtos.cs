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

    // A skill to build
    public class SuggestionSkillResponse
    {
        // The id used by PATCH api/skill-advice-items/{id}/status
        public int SkillSuggestionItemId { get; set; }
        public int SortOrder { get; set; }

        // null = a skill the system doesn't have (shown as plain text)
        public int? SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public ProficiencyLevel? TargetLevel { get; set; }

        // How to build the skill
        public string Advice { get; set; } = string.Empty;
        public SuggestionItemStatus Status { get; set; }
    }

    // A skill a course helps build. SkillId is set when it matches one of the plan's skill steps
    // that is in the Skills table, so the screen can link it to the Skills section.
    public class SuggestionGainedSkill
    {
        public int? SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
    }

    // A course to take
    public class SuggestionCourseResponse
    {
        public int SkillSuggestionItemId { get; set; }
        public int SortOrder { get; set; }

        // The course's own name: the catalogue title, or the title the AI gave an outside course
        public string Title { get; set; } = string.Empty;
        public string? Provider { get; set; }

        // true = one of our training programmes. false = an AI suggestion, not verified.
        public bool IsFromCatalogue { get; set; }

        // One short sentence on what the employee gains
        public string Why { get; set; } = string.Empty;

        // The skills from the Skills section that this course builds
        public List<SuggestionGainedSkill> SkillsGained { get; set; } = new();

        public SuggestionItemStatus Status { get; set; }

        // The catalogue programme with live intake details, or null for an outside course
        public SuggestionProgrammeResponse? Programme { get; set; }

        // true if the employee has unfinished training of that programme
        public bool IsAlreadyAssigned { get; set; }

        // true if the employee finished it after this advice was written
        public bool IsAlreadyCompleted { get; set; }

        // Outside course only: a short description. Show it as "AI suggestion, not verified"; it is never a link.
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

        // At most 5 skills and 3 courses, shown in separate sections
        public List<SuggestionSkillResponse> Skills { get; set; } = new();
        public List<SuggestionCourseResponse> Courses { get; set; } = new();
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