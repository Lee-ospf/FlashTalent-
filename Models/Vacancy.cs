using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum VacancyType
    {
        Internal,
        ClientPlacement
    }

    public enum VacancyStatus
    {
        Draft,
        Published,
        Closed
    }

    // NOTE: This is a MINIMAL STUB owned by Person A only so the Candidate domain
    // compiles and can be tested independently. Person B (Recruiter backend) owns
    // the full Vacancy table (Title, Description, Requirements, Type, ClientId,
    // Status, ClosingDate, etc - see the ERD). When merging branches, replace this
    // file with Person B's complete version - keep VacancyId and the class name
    // "Vacancy" identical so Application.cs and other FKs don't break.
    [Table("Vacancies")]
    public class Vacancy
    {
        [Key]
        public int VacancyId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public bool IsPublished { get; set; } = false;

        public ICollection<Application> Applications { get; set; } = new List<Application>();

            [Required]
            public string Description { get; set; }= string.Empty;

            //  keep free-text requirements alongside structured skills, requiremets like certifications
            public string Requirements { get; set; }=string.Empty;

            [Required]
            public VacancyType VacancyType { get; set; }

            [ForeignKey("Client")]
            public int? ClientId { get; set; }
            public Client Client { get; set; }

            [Required]
            public VacancyStatus Status { get; set; } = VacancyStatus.Draft;

            [MaxLength(100)]
            public string Location { get; set; } = string.Empty;

            public DateTime? ClosingDate { get; set; }

            public int CreatedByRecruiterId { get; set; }

            public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
            public DateTime? PublishedAt { get; set; }

            // Required skills (many-to-many, implicit join table)
            public ICollection<Skill> RequiredSkills { get; set; }= new List<Skill>();
        }


    }
