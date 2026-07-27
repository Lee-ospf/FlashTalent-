using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // Global, system-wide form - reused for every candidate/vacancy.
    // We never delete old rows; the latest UploadedAt is always "the current" template,
    // which gives us a free audit trail without extra modeling.
    [Table("PrescreeningTemplates")]
    public class PrescreeningTemplate
    {
        [Key]
        public int PrescreeningTemplateId { get; set; }

        [Required]
        public string FileUrl { get; set; } = string.Empty;

        [Required]
        public string OriginalFileName { get; set; } = string.Empty;

        [Required, ForeignKey(nameof(UploadedByUser))]
        public int UploadedByUserId { get; set; }
        public User? UploadedByUser { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
