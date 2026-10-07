using System.ComponentModel.DataAnnotations;
using TalentHub.Models;

namespace TalentHub.DTOs
{
  

    public class OnboardingCompleteRequest
    {
        [Range(1, int.MaxValue)]
        public int SourceApplicationId { get; set; }

        // The onboarding system's employee ID, kept exactly as given (e.g. "00456", "EMP-00456").
        [Required, MaxLength(50)]
        public string ExternalEmployeeId { get; set; } = string.Empty;

        // Becomes the user's login email
        [Required, MaxLength(150)]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Invalid Email Address format.")]
        public string WorkEmail { get; set; } = string.Empty;

        [Required]
        public DateTime HireDate { get; set; }

        // defaults to the vacancy's title.
        [MaxLength(100)]
        public string? JobTitle { get; set; }

        [Range(1, int.MaxValue)]
        public int? DepartmentId { get; set; }

        [MaxLength(20)]
        public string? EmployeeNumber { get; set; }

        // Optional: defaults to the vacancy's employment type (FullTime / PartTime / Contract)
        [MaxLength(50)]
        public string? EmploymentType { get; set; }
    }

    public record ProfileCopyResult(int Skills, int Qualifications, int Experiences);

    public class OnboardingCompleteResponse
    {
        public int EmployeeId { get; set; }
        public int UserId { get; set; }
        public string LoginEmail { get; set; } = string.Empty;
        public string? PersonalEmail { get; set; }
        public string Role { get; set; } = string.Empty;
        public bool MustChangePassword { get; set; }
        public bool AlreadyOnboarded { get; set; }
        public string Message { get; set; } = string.Empty;
        public ProfileCopyResult? ProfileCopied { get; set; }
    }

    public class AwaitingOnboardingItem
    {
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string VacancyTitle { get; set; } = string.Empty;
        public DateTime? HiredAt { get; set; }
    }

    // ================= Profile responses =================

    public class EmployeeListItem
    {
        public int EmployeeId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public DateTime? HireDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class EmployeeSkillDto
    {
        public int EmployeeSkillId { get; set; }
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ProficiencyLevel { get; set; } = string.Empty;
    }

    public class EmployeeQualificationDto
    {
        public int EmployeeQualificationId { get; set; }
        public string QualificationType { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public DateTime YearCompleted { get; set; }
        public DateTime? ExpiryDate { get; set; }
        // Computed, not stored: Valid / Expiring / Expired (null if not a certification or no expiry date)
        public string? CertificationStatus { get; set; }
    }

    public class EmployeeExperienceDto
    {
        public int EmployeeExperienceId { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ProjectsAndDuties { get; set; }
    }

    public class EmployeeProfileResponse
    {
        public int EmployeeId { get; set; }
        public int UserId { get; set; }

        // Person (from User)
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;          // login / work email
        public string? PersonalEmail { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public string? Race { get; set; }
        public string? Nationality { get; set; }
        public DateTime? DateOfBirth { get; set; }

        // Employment
        public string? ExternalEmployeeId { get; set; }
        public string? EmployeeNumber { get; set; }
        public string? EmploymentType { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? JobTitle { get; set; }
        public DateTime? HireDate { get; set; }
        public string Status { get; set; } = string.Empty;

        // Profile
        public List<EmployeeSkillDto> Skills { get; set; } = new();
        public List<EmployeeQualificationDto> Qualifications { get; set; } = new();
        public List<EmployeeExperienceDto> Experiences { get; set; } = new();
    }

    // ================= Self-service requests =================

    public class UpdatePersonalDetailsRequest
    {
        [RegularExpression(@"^(\+?27|0)[6-8][0-9]{8}$",
            ErrorMessage = "Phone number must be a valid South African mobile number (e.g. 0821234567 or +27821234567).")]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }
    }

    public class AddEmployeeSkillRequest
    {
        [Range(1, int.MaxValue)]
        public int SkillId { get; set; }

        public ProficiencyLevel ProficiencyLevel { get; set; } = ProficiencyLevel.Beginner;
    }

    public class UpdateEmployeeSkillRequest
    {
        public ProficiencyLevel ProficiencyLevel { get; set; }
    }

    // Used for both add and update
    public class EmployeeQualificationRequest
    {
        [Required]
        public QualificationType QualificationType { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Institution { get; set; } = string.Empty;

        [Required]
        public DateTime YearCompleted { get; set; }

        // Certifications only; must be after YearCompleted
        public DateTime? ExpiryDate { get; set; }
    }

    // Used for both add and update
    public class EmployeeExperienceRequest
    {
        [Required, MaxLength(200)]
        public string Company { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? ProjectsAndDuties { get; set; }
    }
}