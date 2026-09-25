using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // One row per User (Recruiter/Admin) who has connected their Google Calendar.
    // A separate table (rather than columns on User) keeps this optional and
    // easy to disconnect/reconnect without touching the core Users table.
    [Table("GoogleCalendarConnections")]
    public class GoogleCalendarConnection
    {
        [Key]
        public int GoogleCalendarConnectionId { get; set; }

        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }
        public User? User { get; set; }

        [Required, MaxLength(150)]
        public string GoogleAccountEmail { get; set; } = string.Empty;

        // Encrypt this at rest in production (e.g. via ASP.NET Core Data Protection).
        [Required]
        public string RefreshToken { get; set; } = string.Empty;

        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    }
}
