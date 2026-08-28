namespace TalentHub.DTOs
{
    public class CreateApplicationRequest
    {
        public int CandidateId { get; set; }
        public int VacancyId { get; set; }
    }

    public class ApplicationResponse
    {
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int VacancyId { get; set; }
        public string VacancyTitle { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpdateApplicationStatusRequest
    {
        public string NewStatus { get; set; } = string.Empty;

        // UserId of whoever is making the change - in this deliverable, always the
        // logged-in Admin, but kept explicit so ApplicationStatusHistory has a real value.
        public int ChangedByUserId { get; set; }
    }

    public class ApplicationStatusHistoryResponse
    {
        public int ApplicationStatusHistoryId { get; set; }
        public string OldStatus { get; set; } = string.Empty;
        public string NewStatus { get; set; } = string.Empty;
        public string ChangedByName { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
    }
}