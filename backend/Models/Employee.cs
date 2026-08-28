using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("Employees")]
    public class Employee
    {
        [Key]
        public int EmployeeId { get; set; }

        // Links back to the same User row the candidate logged in with -
        // a hired candidate keeps the same login, just gains an Employee profile
        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        // Keep a reference to which application resulted in this hire, for traceability
        [ForeignKey(nameof(Application))]
        public int? SourceApplicationId { get; set; }

        public Application? SourceApplication { get; set; }

        [MaxLength(20)]
        public string? EmployeeNumber { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? EmploymentType { get; set; }

        [MaxLength(100)]
        public string? Department { get; set; }

        [MaxLength(100)]
        public string? JobTitle { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Active";

        public DateTime? DateOfBirth { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}