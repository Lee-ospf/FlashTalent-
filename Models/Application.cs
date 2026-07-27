    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;

    namespace TalentHub.Models
    {
        public enum ApplicationStatus
        {
            Applied,
            UnderReview,
            Shortlisted,
            OfferExtended,
            Hired,
            NotSelected
        }

        [Table("Applications")]
        public class Application
        {
            [Key]
            public int ApplicationId { get; set; }

            [Required, ForeignKey(nameof(Candidate))]
            public int CandidateId { get; set; }

            public Candidate? Candidate { get; set; }

            // Points to Person B's Vacancy table - see Vacancy.cs stub in this same Models folder
            [Required, ForeignKey(nameof(Vacancy))]
            public int VacancyId { get; set; }

            public Vacancy? Vacancy { get; set; }

            [Required]
            public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;

            public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

            public DateTime? UpdatedAt { get; set; }

            // Navigation properties
            public ICollection<ApplicationStatusHistory> StatusHistory { get; set; } = new List<ApplicationStatusHistory>();
            public Prescreening? Prescreening { get; set; }
            public ICollection<Interview> Interviews { get; set; } = new List<Interview>();
        }
    }