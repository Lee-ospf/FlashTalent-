namespace TalentHub.DTOs
{
    public class ScheduleInterviewRequest
    {
        public string InterviewType { get; set; } = string.Empty; // InPerson/Virtual/Phone
        public string InterviewCategory { get; set; } = string.Empty; // HR/Technical/Behavioral/Panel/Managerial/Final
        public DateTime ScheduledAt { get; set; }
        public int DurationMinutes { get; set; } = 60;
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }

        // Extra guest emails the organizer wants added to the calendar invite,
        // on top of the candidate. Optional - a null/empty list just means
        // it's the recruiter + candidate, as before.
        public List<string>? GuestEmails { get; set; }

        // If the scheduling recruiter's calendar shows a conflict at this time,
        // the request is rejected with 409 unless this is set to true.
        public bool IgnoreCalendarConflicts { get; set; } = false;
    }


    public class SetInterviewOutcomeRequest
    {
        public string Outcome { get; set; } = string.Empty; // Passed/Failed
        public string? RecruiterNotes { get; set; }
    }
    public class RescheduleInterviewRequest
    {
        public DateTime ScheduledAt { get; set; }
        public int? DurationMinutes { get; set; }
        public string? InterviewType { get; set; }
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }

        // Same guest-list handling as ScheduleInterviewRequest. Null means
        // "leave the existing guest list alone"; an empty list clears it.
        public List<string>? GuestEmails { get; set; }
        public string RescheduleReason { get; set; } = string.Empty;
        public bool IgnoreCalendarConflicts { get; set; } = false;
    }
    public class InterviewRescheduleResponse
    {
        public DateTime OldScheduledAt { get; set; }
        public DateTime NewScheduledAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ChangedByName { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
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
        public string InterviewCategory { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public int DurationMinutes { get; set; }
        public DateTime EndTime { get; set; }
        public string? Location { get; set; }
        public string? MeetingLink { get; set; }
        public List<string> GuestEmails { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public string? RecruiterNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        // Calendar integration status, for Angular to display
        // (Created / Updated / Cancelled / Failed / NotIntegrated).
        public string CalendarIntegrationStatus { get; set; } = string.Empty;
        public string? CalendarEventId { get; set; }
        public string? CalendarProvider { get; set; }
        public string? CalendarIntegrationError { get; set; }
    }

    public class CalendarConflictDto
    {
        public DateTime ConflictStart { get; set; }
        public DateTime ConflictEnd { get; set; }
    }

    public class CalendarAvailabilityResponse
    {
        public bool IsAvailable { get; set; }
        public bool CalendarConnected { get; set; }
        public List<CalendarConflictDto> Conflicts { get; set; } = new();
    }
}
