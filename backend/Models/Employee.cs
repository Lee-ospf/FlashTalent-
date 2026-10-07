using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    
    
    // The work email is NOT stored here: it becomes User.Email at onboarding.
    [Table("Employees")]
    public class Employee
    {
        [Key]
        public int EmployeeId { get; set; }

        // Same User row the candidate logged in with - a hired candidate keeps the
        // same account, but its login email becomes the work email.
        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        // Which application resulted in this hire, for traceability
        [ForeignKey(nameof(SourceApplication))]
        public int? SourceApplicationId { get; set; }

        public Application? SourceApplication { get; set; }

        
        [MaxLength(50)]
        public string? ExternalEmployeeId { get; set; }

        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }

        [MaxLength(20)]
        public string? EmployeeNumber { get; set; }

        [MaxLength(50)]
        public string? EmploymentType { get; set; }

        // Holds StaffSyncDB "Occupation"
        [MaxLength(100)]
        public string? JobTitle { get; set; }

        // StaffSyncDB "HireDate"
        public DateTime? HireDate { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Profile 
        public ICollection<EmployeeSkill> EmployeeSkills { get; set; } = new List<EmployeeSkill>();
        public ICollection<EmployeeQualification> Qualifications { get; set; } = new List<EmployeeQualification>();
        public ICollection<EmployeeExperience> Experiences { get; set; } = new List<EmployeeExperience>();
    }
}