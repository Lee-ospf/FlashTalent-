namespace TalentHub.DTOs
{
    public class PrescreeningTemplateResponse
    {
        public int PrescreeningTemplateId { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class PrescreeningResponse
    {
        public int PrescreeningId { get; set; }
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int VacancyId { get; set; }
        public string VacancyTitle { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public string? CompletedFileUrl { get; set; }
        public string? CompletedOriginalFileName { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string Outcome { get; set; } = string.Empty;
        public string? RecruiterNotes { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }

    public class SetPrescreeningOutcomeRequest
    {
        public string Outcome { get; set; } = string.Empty; // "Passed" / "Failed"
        public string? RecruiterNotes { get; set; }
    }
}
