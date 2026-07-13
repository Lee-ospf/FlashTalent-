using System.ComponentModel.DataAnnotations;
using TalentHub.Models;

namespace TalentHub.DTOs
{
    public class RequiredDocumentDto
    {
        public string DocumentType { get; set; } = string.Empty;
        public bool IsMandatory { get; set; } = true;
    }

    public class CreateVacancyDto

    {
        public int RecruiterId { get; set; }
        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public string VacancyType { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }     // required if Internal
        public int? ClientId { get; set; }         // required if ClientPlacement

        [Required]
        public EmploymentType EmploymentType { get; set; }

        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        [MaxLength(100)]
        public string Location { get; set; }

        public DateTime? ClosingDate { get; set; }

        public int? MinYearsExperience { get; set; }

        public string RequiredQualifications { get; set; }

        public string Requirements { get; set; }

        public List<VacancySkillDto> Skills { get; set; } = new();

        public List<RequiredDocumentDto> RequiredDocuments { get; set; } = new();
    }
    public class VacancyResponse
    {
        public int VacancyId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string VacancyType { get; set; }
        public int? DepartmentId { get; set; }
        public int? ClientId { get; set; }
        public string EmploymentType { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string Location { get; set; }
        public DateTime? ClosingDate { get; set; }
        public int? MinYearsExperience { get; set; }
        public string RequiredQualifications { get; set; }
        public string Requirements { get; set; }
        public string Status { get; set; }
        public int CreatedByRecruiterId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public List<VacancySkillDto> Skills { get; set; } = new();
        public List<RequiredDocumentDto> RequiredDocuments { get; set; } = new();
    }
    public class UpdateVacancyDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string VacancyType { get; set; }
        public int? DepartmentId { get; set; }
        public int? ClientId { get; set; }
        public EmploymentType EmploymentType { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string Location { get; set; }
        public DateTime? ClosingDate { get; set; }
        public int? MinYearsExperience { get; set; }
        public string RequiredQualifications { get; set; } 
        public string Requirements { get; set; }
        public List<VacancySkillDto> Skills { get; set; } = new();
        public List<RequiredDocumentDto> RequiredDocuments { get; set; } = new();
    }
}
