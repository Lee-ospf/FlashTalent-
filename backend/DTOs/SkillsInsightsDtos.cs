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

    // ================= Skills report: rings =================

    // One ring: how many active employees have the skill, split by level
    public class InsightRingItem
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public SkillCategory Category { get; set; }

        // People with the skill at any level
        public int Total { get; set; }
        public int Beginner { get; set; }
        public int Intermediate { get; set; }
        public int Expert { get; set; }

        // Active employees who don't have the skill
        public int NoSkill { get; set; }
    }

    public class InsightRingsResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int ActiveEmployeeCount { get; set; }

        // Same order as the skillIds in the request
        public List<InsightRingItem> Rings { get; set; } = new();

        // The department filter that was applied: null = all, 0 = no department, otherwise a DepartmentId
        public int? DepartmentFilter { get; set; }
    }

    // ================= Skills report: departments =================

    public class InsightDepartmentCountItem
    {
        // null = employees with no department. The screen shows "Unassigned".
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;

        // Active employees in the department
        public int Headcount { get; set; }

        // Of those, how many have the skill at any level
        public int WithSkill { get; set; }
    }

    public class InsightDepartmentCountsResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int TotalHeadcount { get; set; }
        public int TotalWithSkill { get; set; }
        public List<InsightDepartmentCountItem> Departments { get; set; } = new();
    }

    // ================= Skills report: people =================

    public class InsightPersonItem
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }

        // null = no department. The screen shows "Unassigned".
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public ProficiencyLevel Level { get; set; }

        // 1 = Beginner, 2 = Intermediate, 3 = Expert. Also used in the CSV.
        public int LevelValue => (int)Level + 1;
    }

    public class InsightPeopleResponse
    {
        public DateTime GeneratedAt { get; set; }
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;

        // The level filter that was applied: 1 to 3, or null for any level
        public int? LevelFilter { get; set; }

        // The department filter that was applied: null = all, 0 = no department, otherwise a DepartmentId
        public int? DepartmentFilter { get; set; }

        public int Count { get; set; }
        public List<InsightPersonItem> People { get; set; } = new();
    }
}