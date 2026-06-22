using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum DocumentType
    {
        CV,
        MatricCertificate,
        Qualification,
        Certification,
        Other
    }

    [Table("CandidateDocuments")]
    public class CandidateDocument
    {
        [Key]
        public int CandidateDocumentId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        [Required]
        public DocumentType DocumentType { get; set; }

        // Path on disk (or blob URL later) - never store the raw file bytes in the DB
        [Required, MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;

        [MaxLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}