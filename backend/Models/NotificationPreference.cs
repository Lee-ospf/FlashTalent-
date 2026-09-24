using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("UserNotificationPreferences")]
    public class UserNotificationPreference
    {
        [Key]
        public int UserNotificationPreferenceId { get; set; }

        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }
        public User? User { get; set; }

        // null = this is the user's global default, applies to every NotificationType
        // that doesn't have its own specific row
        public NotificationType? NotificationType { get; set; }

        [Required]
        public NotificationChannel Channel { get; set; }
    }
}
