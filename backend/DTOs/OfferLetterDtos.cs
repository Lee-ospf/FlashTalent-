namespace TalentHub.DTOs
{
    public class CreateOfferTemplateRequest
    {
        public string HtmlContent { get; set; } = string.Empty;
    }

    public class OfferLetterTemplateResponse
    {
        public int OfferLetterTemplateId { get; set; }
        public string HtmlContent { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class GenerateOfferRequest
    {
        public decimal Salary { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime ClosingDate { get; set; }

        // Optional overrides - if not provided, auto-pulled from the Vacancy
        public string? JobTitle { get; set; }
        public string? EmploymentType { get; set; }
        public string? Location { get; set; }
    }

    public class RespondToOfferRequest
    {
        public string Response { get; set; } = string.Empty; // "Accepted" / "Declined"
    }

    public class OfferLetterResponse
    {
        public int OfferLetterId { get; set; }
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int VacancyId { get; set; }
        public int VersionNumber { get; set; }
        public decimal Salary { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime ClosingDate { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string GeneratedHtml { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public DateTime? RespondedAt { get; set; }
    }
}