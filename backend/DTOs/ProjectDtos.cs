using System.ComponentModel.DataAnnotations;
using TalentHub.Models;

namespace TalentHub.DTOs
{
    public class ProjectSkillRequest
    {
        [Range(1, int.MaxValue)]
        public int SkillId { get; set; }

        public bool IsRequired { get; set; } = true;

        // Sent as text: "Beginner", "Intermediate" or "Expert"
        public ProficiencyLevel MinimumLevel { get; set; } = ProficiencyLevel.Beginner;
    }

    // Used for both create and edit (an edit replaces the content)
    public class SaveProjectRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        [Range(0, 60)]
      

        public string? RequiredQualifications { get; set; }

        public List<ProjectSkillRequest> Skills { get; set; } = new();
    }

    public class ProjectSkillResponse
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public ProficiencyLevel MinimumLevel { get; set; }
    }

    public class ProjectResponse
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public ProjectStatus Status { get; set; }

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string RequiredQualifications { get; set; } = string.Empty;
        public int CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastMatchedAt { get; set; }
        public int MemberCount { get; set; }
        public List<ProjectSkillResponse> Skills { get; set; } = new();
    }

    public class ProjectListItem
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public ProjectStatus Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int SkillCount { get; set; }
        public string? DepartmentName { get; set; }
        public int MemberCount { get; set; }
        public DateTime? LastMatchedAt { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}