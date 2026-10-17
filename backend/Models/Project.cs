using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum ProjectStatus
    {
        Active,
        Closed
    }

    [Table("Projects")]
    public class Project
    {
        [Key]
        public int ProjectId { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        [Required]
        public ProjectStatus Status { get; set; } = ProjectStatus.Active;

        // Optional extra requirements

        [ForeignKey(nameof(Department))]
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }

        public string RequiredQualifications { get; set; } = string.Empty;

        // HR or Admin who created the project (the owner)
        [Required, ForeignKey(nameof(CreatedByUser))]
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // When HR last ran the match for this project
        public DateTime? LastMatchedAt { get; set; }

        public ICollection<ProjectSkill> ProjectSkills { get; set; } = new List<ProjectSkill>();
        public ICollection<ProjectDocument> Documents { get; set; } = new List<ProjectDocument>();
        public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
        public ICollection<ProjectMatch> Matches { get; set; } = new List<ProjectMatch>();
    }
}