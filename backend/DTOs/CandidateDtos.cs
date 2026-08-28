using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateCandidateRequest
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

    public class UpdateCandidateRequest
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
        //public string? Address { get; set; }
        public DateTime? DateOfBirth { get; set; }
       
        public DateTime RegisteredAt { get; set; }
        public List<string> UploadedDocumentTypes { get; set; } = new();
    }
}
