using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum VacancyType
    {
        Internal,
        ClientPlacement  //External
    }

    public enum VacancyStatus
    {
        Draft,
        Published,
        Closed
    }
    public enum EmploymentType { FullTime, PartTime, Contract }

    [Table("Vacancies")]
    public class Vacancy
    {
        [Key]
        public int VacancyId { get; set; }

        [Required, ForeignKey(nameof(Recruiter))]
        public int CreatedByRecruiterId { get; set; }
        public Recruiter? Recruiter { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public VacancyType VacancyType { get; set; }

        // Only set when VacancyType = Internal
        [ForeignKey(nameof(Department))]
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }

        // Only set when VacancyType = ClientPlacement
        [ForeignKey(nameof(Client))]
        public int? ClientId { get; set; }
        public Client? Client { get; set; }

        [Required]
        public EmploymentType EmploymentType { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? SalaryMin { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? SalaryMax { get; set; }

        [MaxLength(100)]
        public string Location { get; set; } = string.Empty;

        public DateTime? ClosingDate { get; set; }

        public int? MinYearsExperience { get; set; }

        public string RequiredQualifications { get; set; } = string.Empty;

        public string Requirements { get; set; } = string.Empty;

        [Required]
        public VacancyStatus Status { get; set; } = VacancyStatus.Draft;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PublishedAt { get; set; }

        // Navigation
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<VacancySkill> VacancySkills { get; set; } = new List<VacancySkill>();
        public ICollection<VacancyDocument> RequiredDocuments { get; set; } = new List<VacancyDocument>();
    }

}
