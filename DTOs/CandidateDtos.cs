using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateCandidateRequest
    {
        [Required]
        public int UserId { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? DateOfBirth { get; set; }

        
    }

    public class UpdateCandidateRequest
    {
        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(50)]
        public string? Race { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? DateOfBirth { get; set; }

        
    }

    public class CandidateResponse
    {
        public int CandidateId { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public string? Race { get; set; }
        public string? Nationality { get; set; }
        public string? Address { get; set; }
        public DateTime? DateOfBirth { get; set; }
       
        public DateTime RegisteredAt { get; set; }
        public List<string> UploadedDocumentTypes { get; set; } = new();
    }
}
