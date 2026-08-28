using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum UserRole
    {
        Candidate,
        Recruiter,
        Admin
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

        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        // Never store plain text passwords - this stores the BCrypt hash only
        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.Candidate;

        public bool IsActive { get; set; } = true;
        public bool MustChangePassword { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation: one User has at most one Candidate profile
        public Candidate? Candidate { get; set; }
        public Recruiter? Recruiter { get; set; }
    }
}