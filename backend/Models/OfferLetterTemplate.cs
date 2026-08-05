using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // Global, system-wide HTML template - stored directly as text, no file involved.
    // We never delete old rows; GET always returns the most recently uploaded one,
    // which gives a free audit trail without extra modeling (same pattern as PrescreeningTemplate).
    [Table("OfferLetterTemplates")]
    public class OfferLetterTemplate
    {
        [Key]
        public int OfferLetterTemplateId { get; set; }

        [Required]
        public string HtmlContent { get; set; } = string.Empty;

        [Required, ForeignKey(nameof(UploadedByUser))]
        public int UploadedByUserId { get; set; }
        public User? UploadedByUser { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}