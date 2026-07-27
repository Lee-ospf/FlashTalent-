using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum QualificationType
    {
        Education,
        Certification
    }

    // Covers both the "Formal Qualifications" and "Certifications" sections of the
    // CV template - they share identical columns (Qualification/Institution/Year),
    // so one table with a Type flag avoids duplicating schema, DTOs, and endpoints
    // for two structurally identical concepts.
    [Table("CandidateQualifications")]
    public class CandidateQualification
    {
        [Key]
        public int CandidateQualificationId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        [Required]
        public QualificationType QualificationType { get; set; }

        // The "Qualification" column on the CV template (e.g. "BSc Computer Science",
        // "AWS Certified Solutions Architect")
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Institution { get; set; } = string.Empty;

        [Required]
        public DateTime YearCompleted { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}