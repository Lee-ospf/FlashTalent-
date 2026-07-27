using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("VacancyChangeHistories")]
    public class VacancyChangeHistory
    {
        [Key]
        public int VacancyChangeHistoryId { get; set; }

        // Deliberately NOT a foreign key to Vacancy - so this record survives even if
        // the vacancy itself is later deleted (only Draft vacancies can be deleted, but
        // the audit trail should be permanent regardless).
        public int VacancyId { get; set; }

        // Snapshot of the vacancy's title at the time of the change, so the log is still
        // readable even if the vacancy no longer exists.
        [MaxLength(200)]
        public string VacancyTitle { get; set; } = string.Empty;

        // "Created", "Edited", "Published", "Closed", "Deleted"
        [Required, MaxLength(20)]
        public string Action { get; set; } = string.Empty;

        [Required, ForeignKey(nameof(ChangedByUser))]
        public int ChangedByUserId { get; set; }
        public User? ChangedByUser { get; set; }
        [MaxLength(2000)]
        public string? Details { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}