using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum OfferLetterStatus
    {
        Sent,
        Accepted,
        Declined
    }

    [Table("OfferLetters")]
    public class OfferLetter
    {
        [Key]
        public int OfferLetterId { get; set; }

        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }
        public Application? Application { get; set; }

        [Required]
        public int VersionNumber { get; set; }

        // Recruiter-entered at generate time - not stored anywhere else in the system
        [Column(TypeName = "decimal(18,2)")]
        public decimal Salary { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime ClosingDate { get; set; }

        // Snapshotted from Vacancy at generate time - frozen even if the Vacancy
        // is edited later, since an offer letter shouldn't silently change after being sent.
        [MaxLength(200)]
        public string JobTitle { get; set; } = string.Empty;

        [MaxLength(50)]
        public string EmploymentType { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Location { get; set; } = string.Empty;

        [Required]
        public string GeneratedHtml { get; set; } = string.Empty;

        [Required]
        public OfferLetterStatus Status { get; set; } = OfferLetterStatus.Sent;

        [Required, ForeignKey(nameof(SentByUser))]
        public int SentByUserId { get; set; }
        public User? SentByUser { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public DateTime? RespondedAt { get; set; }
    }
}