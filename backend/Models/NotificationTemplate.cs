using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("NotificationTemplates")]
    public class NotificationTemplate
    {
        [Key]
        public int NotificationTemplateId { get; set; }

        [Required]
        public NotificationType NotificationType { get; set; }

        [Required]
        public NotificationChannel Channel { get; set; }

        [MaxLength(200)]
        public string? Subject { get; set; }   // in-app messages may not need one

        [Required]
        public string BodyTemplate { get; set; } = string.Empty;   // uses {{Placeholder}} tokens

        public bool IsActive { get; set; } = true;
    }
}