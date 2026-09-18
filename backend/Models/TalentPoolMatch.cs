using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum TalentPoolMatchStage
    {
        
        DraftSuggestion,

        
        FullRanking
    }

    [Table("TalentPoolMatches")]
    public class TalentPoolMatch
    {
        [Key]
        public int TalentPoolMatchId { get; set; }

        [Required, ForeignKey(nameof(Vacancy))]
        public int VacancyId { get; set; }
        public Vacancy? Vacancy { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }
        public Candidate? Candidate { get; set; }

        [Required]
        public TalentPoolMatchStage Stage { get; set; }

        // 0-100, set by the AI - not a deterministic formula.
        [Required]
        public int Score { get; set; }

        
        public string Reasoning { get; set; } = string.Empty;

       
        public DateTime? InvitedAt { get; set; }

        public DateTime ComputedAt { get; set; } = DateTime.UtcNow;

        
        [MaxLength(50)]
        public string ModelVersion { get; set; } = string.Empty;
    }
}