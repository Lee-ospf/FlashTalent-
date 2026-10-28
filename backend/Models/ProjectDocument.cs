using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("ProjectDocuments")]
    public class ProjectDocument
    {
        [Key]
        public int ProjectDocumentId { get; set; }

        [ForeignKey(nameof(Project))]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required, MaxLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        // Random name on disk, never the user's file name
        [Required, MaxLength(100)]
        public string StoredFileName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string ContentType { get; set; } = string.Empty;

        public long SizeBytes { get; set; }

        [Required, ForeignKey(nameof(UploadedByUser))]
        public int UploadedByUserId { get; set; }
        public User? UploadedByUser { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}