using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateQualificationRequest
    {
        [Required]
        public string QualificationType { get; set; } = string.Empty; // "Education" or "Certification"

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Institution { get; set; } = string.Empty;

        [Required]
        public DateTime YearCompleted { get; set; }
    }

    public class QualificationResponse
    {
        public int CandidateQualificationId { get; set; }
        public int CandidateId { get; set; }
        public string QualificationType { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public DateTime YearCompleted { get; set; }
    }

    public class CreateExperienceRequest
    {
        [Required, MaxLength(200)]
        public string Company { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        // Leave null if this is the candidate's current role
        public DateTime? EndDate { get; set; }

        public string? ProjectsAndDuties { get; set; }
    }

    public class ExperienceResponse
    {
        public int CandidateExperienceId { get; set; }
        public int CandidateId { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ProjectsAndDuties { get; set; }
        public bool IsCurrent => EndDate == null;
    }
}