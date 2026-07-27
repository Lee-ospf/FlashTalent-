using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // NOTE: The full ERD's TalentPool includes ai_match_score and skills_snapshot,
    // but the scope doc explicitly excludes AI matching from this deliverable:
    // "No AI matching, talent pool, or reporting functionality is required."
    // This is kept as the simplest possible version - a flag/list of rejected
    // candidates - so it satisfies D9 ("write-on-rejection logic") without
    // building unrequested AI features. Columns can be added later without
    // breaking anything that depends on this table.
    [Table("TalentPoolEntries")]
    public class TalentPool
    {
        [Key]
        public int TalentPoolId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        // Last vacancy the candidate was rejected from, for context
        [ForeignKey(nameof(LastVacancy))]
        public int? LastVacancyId { get; set; }

        public Vacancy? LastVacancy { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}