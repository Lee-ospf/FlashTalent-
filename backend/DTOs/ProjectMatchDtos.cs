namespace TalentHub.DTOs
{
    public class ProjectMatchResponse
    {
        public int ProjectMatchId { get; set; }
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }

        public int Score { get; set; }                 // from the AI
        public string Reasoning { get; set; } = string.Empty;
        public GapAnalysisResult Gaps { get; set; } = new();   // from the rules

        // Includes this project if the employee is already a member
        public int ActiveProjectCount { get; set; }
        public bool IsMember { get; set; }
        public bool IsDismissed { get; set; }
        public DateTime? ProfileUpdatedAt { get; set; }
        public DateTime ComputedAt { get; set; }
    }

    public class ProjectMatchRunResponse
    {
        public int ProjectId { get; set; }
        public DateTime? LastMatchedAt { get; set; }
        public List<ProjectMatchResponse> Matches { get; set; } = new();
    }

    public class AddProjectMemberRequest
    {
        [System.ComponentModel.DataAnnotations.Range(1, int.MaxValue)]
        public int EmployeeId { get; set; }
    }

    public class ProjectMemberResponse
    {
        public int ProjectMemberId { get; set; }
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }
        public string AddedByName { get; set; } = string.Empty;
        public DateTime AddedAt { get; set; }
    }
}