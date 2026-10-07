using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // Mirrors CandidateQualification (reuses QualificationType), plus ExpiryDate
    [Table("EmployeeQualifications")]
    public class EmployeeQualification
    {
        [Key]
        public int EmployeeQualificationId { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }

        public Employee? Employee { get; set; }

        [Required]
        public QualificationType QualificationType { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Institution { get; set; } = string.Empty;

        [Required]
        public DateTime YearCompleted { get; set; }

        // Only valid for certifications. Null = no expiry, or not yet known
        // (copied candidate qualifications start with it empty).
        public DateTime? ExpiryDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}