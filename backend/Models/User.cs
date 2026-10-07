using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // New roles are always appended at the END so existing stored values keep their meaning.
    public enum UserRole
    {
        Candidate,
        Recruiter,
        Admin,
        Employee
    }

    [Table("Users")]
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        // The LOGIN email. Candidates: their personal email.
        // Employees: the work email (swapped in when onboarding completes).
        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        // The personal email kept for contact/recovery after the login email
        // becomes the work email. Null until onboarding completes.
        [MaxLength(150)]
        public string? PersonalEmail { get; set; }

        
        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.Candidate;

        public bool IsActive { get; set; } = true;
        public bool MustChangePassword { get; set; } = false;


        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation: one User has at most one Candidate profile
        public Candidate? Candidate { get; set; }
        public Recruiter? Recruiter { get; set; }
    }
}