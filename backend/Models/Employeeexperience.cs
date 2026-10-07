using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // Pre-hire employment history only (mirrors CandidateExperience).
    [Table("EmployeeExperiences")]
    public class EmployeeExperience
    {
        [Key]
        public int EmployeeExperienceId { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }

        public Employee? Employee { get; set; }

        [Required, MaxLength(200)]
        public string Company { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        // Null = currently working there
        public DateTime? EndDate { get; set; }

        public string? ProjectsAndDuties { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}