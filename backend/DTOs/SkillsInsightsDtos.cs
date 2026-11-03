using TalentHub.Models;

namespace TalentHub.DTOs
{
    // ================= Employee skills (directory, matrix, heatmap) =================

    public class InsightSkillRef
    {
        public int SkillId { get; set; }
        public string Name { get; set; } = string.Empty;
        public SkillCategory Category { get; set; }
    }

    public class InsightEmployeeSkill
    {
        public int SkillId { get; set; }
        public ProficiencyLevel Level { get; set; }

        // 1 = Beginner, 2 = Intermediate, 3 = Expert. Use this for sorting, colours and averages.
        public int LevelValue => (int)Level + 1;
    }

    public class InsightEmployeeRow
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }

        // null = no department. The screen shows "Unassigned".
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        // Only skills the employee has. Names are in the response's Skills list (join on SkillId).
        public List<InsightEmployeeSkill> Skills { get; set; } = new();
    }

    public class InsightEmployeeSkillsResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int? DepartmentId { get; set; }
        public int EmployeeCount { get; set; }

        // EVERY skill in the system, including ones nobody has, so matrix columns and gaps show up
        public List<InsightSkillRef> Skills { get; set; } = new();
        public List<InsightEmployeeRow> Employees { get; set; } = new();
    }

    // ================= Per-skill summary =================

    public class InsightSkillSummaryItem
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public SkillCategory Category { get; set; }

        public int EmployeeCount { get; set; }
        public int BeginnerCount { get; set; }
        public int IntermediateCount { get; set; }
        public int ExpertCount { get; set; }

        // EmployeeCount / ActiveEmployeeCount x 100, one decimal. 0 when there are no employees.
        public double CoveragePercent { get; set; }

        // Active training programmes that build this skill. 0 = a skill with no training on offer.
        public int ActiveProgrammeCount { get; set; }
    }

    public class InsightSkillSummaryResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int? DepartmentId { get; set; }
        public int ActiveEmployeeCount { get; set; }
        public List<InsightSkillSummaryItem> Skills { get; set; } = new();
    }

    // ================= Career interests (shared goals only) =================

    public class InsightCareerInterestEmployee
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }
        public int CareerGoalId { get; set; }
        public DateTime? TargetDate { get; set; }
    }

    public class InsightCareerInterestItem
    {
        // The most common spelling in the group
        public string TargetRole { get; set; } = string.Empty;
        public int EmployeeCount { get; set; }
        public DateTime? EarliestTargetDate { get; set; }
        public List<InsightCareerInterestEmployee> Employees { get; set; } = new();
    }

    public class InsightCareerInterestsResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int? DepartmentId { get; set; }
        public List<InsightCareerInterestItem> Interests { get; set; } = new();
    }

    // ================= Skills the AI named that the system doesn't have =================

    public class InsightUnknownSkillItem
    {
        public string SkillName { get; set; } = string.Empty;

        // Different employees whose advice mentions it
        public int EmployeeCount { get; set; }

        // Total times it was mentioned
        public int MentionCount { get; set; }
        public int FromCareerGoals { get; set; }
        public int FromProjects { get; set; }
    }

    public class InsightUnknownSkillsResponse
    {
        public DateTime GeneratedAt { get; set; }
        public List<InsightUnknownSkillItem> Skills { get; set; } = new();
    }
}