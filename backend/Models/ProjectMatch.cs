using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("ProjectMatches")]
    public class ProjectMatch
    {
        [Key]
        public int ProjectMatchId { get; set; }

        [Required, ForeignKey(nameof(Project))]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        // 0-100, from the existing matching engine
        [Required]
        public int Score { get; set; }

        // The engine's "why this score" explanation
        public string Reasoning { get; set; } = string.Empty;

        // Rule-based gap analysis snapshot (Met / Below level / Missing / extras), as JSON
        public string GapDetailsJson { get; set; } = "[]";

        
        public bool IsDismissed { get; set; } = false;

        [ForeignKey(nameof(DismissedByUser))]
        public int? DismissedByUserId { get; set; }
        public User? DismissedByUser { get; set; }
        public DateTime? DismissedAt { get; set; }

        public DateTime ComputedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string ModelVersion { get; set; } = string.Empty;
    }
}