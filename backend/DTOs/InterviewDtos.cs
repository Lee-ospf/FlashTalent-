namespace TalentHub.DTOs
{
    public class ScheduleInterviewRequest
    {
        public string InterviewType { get; set; } = string.Empty; // InPerson/Virtual/Phone
        public DateTime ScheduledAt { get; set; }
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }
    }

    public class RescheduleInterviewRequest
    {
        public DateTime ScheduledAt { get; set; }
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }
    }

    public class SetInterviewOutcomeRequest
    {
        public string Outcome { get; set; } = string.Empty; // Passed/Failed
        public string? RecruiterNotes { get; set; }
    }

    public class InterviewResponse
    {
        public int InterviewId { get; set; }
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int VacancyId { get; set; }
        public string VacancyTitle { get; set; } = string.Empty;
        public int RoundNumber { get; set; }
        public string InterviewType { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public string? RecruiterNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}