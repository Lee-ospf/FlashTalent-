using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("ApplicationStatusHistories")]
    public class ApplicationStatusHistory
    {
        [Key]
        public int ApplicationStatusHistoryId { get; set; }

        [Required, ForeignKey(nameof(Application))]
        public int ApplicationId { get; set; }

        public Application? Application { get; set; }

        [Required]
        public ApplicationStatus OldStatus { get; set; }

        [Required]
        public ApplicationStatus NewStatus { get; set; }

        // Who made the change (usually a Recruiter's UserId, but candidate-applying
        // also writes a row here with OldStatus == NewStatus == Applied)
        [Required, ForeignKey(nameof(ChangedByUser))]
        public int ChangedByUserId { get; set; }

        public User? ChangedByUser { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}