namespace TalentHub.DTOs
{
    public class ApplicationReviewResponse
    {
        public ApplicationSectionDto Application { get; set; } = new();
        public CandidateSectionDto Candidate { get; set; } = new();
        public VacancySectionDto Vacancy { get; set; } = new();
    }

    public class ApplicationSectionDto
    {
        public int ApplicationId { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
    }

    public class CandidateSectionDto
    {
        public int CandidateId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? CvUrl { get; set; }
        public List<CandidateSkillDto> Skills { get; set; } = new();
        public List<CandidateQualificationDto> Qualifications { get; set; } = new();
        public List<CandidateQualificationDto> Certifications { get; set; } = new();
        public List<CandidateExperienceDto> Experiences { get; set; } = new();
    }

    public class CandidateSkillDto
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ProficiencyLevel { get; set; } = string.Empty;
    }

    public class CandidateQualificationDto
    {
        public string Name { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public DateTime YearCompleted { get; set; }
    }

    public class CandidateExperienceDto
    {
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ProjectsAndDuties { get; set; }
    }

    public class VacancySectionDto
    {
        public int VacancyId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string? Location { get; set; }
        public int? MinYearsExperience { get; set; }
        public string RequiredQualifications { get; set; } = string.Empty;
        public string Requirements { get; set; } = string.Empty;
        public string VacancyType { get; set; } = string.Empty;
        public string? PostedFor { get; set; }
        public List<VacancySkillDto> RequiredSkills { get; set; } = new();
    }

}