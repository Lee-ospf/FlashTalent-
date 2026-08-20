using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IInterviewService
    {
        InterviewResponse MapToResponse(Interview i, Application a);
        Notification BuildScheduledNotification(Application a, Interview i);
        Notification BuildRescheduledNotification(Application a, Interview i);
        Notification BuildCancelledNotification(Application a, Interview i);
    }

    public class InterviewService : IInterviewService
    {
        public const int MaxRounds = 5;

        public InterviewResponse MapToResponse(Interview i, Application a)
        {
            return new InterviewResponse
            {
                InterviewId = i.InterviewId,
                ApplicationId = i.ApplicationId,
                CandidateId = a.CandidateId,
                CandidateName = a.Candidate?.User != null
                    ? $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}"
                    : "Unknown",
                VacancyId = a.VacancyId,
                VacancyTitle = a.Vacancy?.Title ?? "Unknown",
                RoundNumber = i.RoundNumber,
                InterviewType = i.InterviewType.ToString(),
                InterviewCategory = i.InterviewCategory.ToString(),
                ScheduledAt = i.ScheduledAt,
                Location = i.Location,
                MeetingLink = i.MeetingLink,
                Status = i.Status.ToString(),
                Outcome = i.Outcome.ToString(),
                RecruiterNotes = i.RecruiterNotes,
                CreatedAt = i.CreatedAt,
                CompletedAt = i.CompletedAt
            };
        }

        public Notification BuildScheduledNotification(Application a, Interview i)
        {
            return new Notification
            {
                UserId = a.Candidate!.UserId,
                NotificationType = NotificationType.InterviewScheduled,
                Subject = "Interview scheduled",
                Body = $"An interview (Round {i.RoundNumber}) has been scheduled for {i.ScheduledAt:f} regarding your application to {a.Vacancy!.Title}.",
                SentAt = DateTime.UtcNow
            };
        }

        public Notification BuildRescheduledNotification(Application a, Interview i)
        {
            return new Notification
            {
                UserId = a.Candidate!.UserId,
                NotificationType = NotificationType.InterviewRescheduled,
                Subject = "Interview rescheduled",
                Body = $"Your interview for {a.Vacancy!.Title} has been rescheduled to {i.ScheduledAt:f}.",
                SentAt = DateTime.UtcNow
            };
        }

        public Notification BuildCancelledNotification(Application a, Interview i)
        {
            return new Notification
            {
                UserId = a.Candidate!.UserId,
                NotificationType = NotificationType.InterviewCancelled,
                Subject = "Interview cancelled",
                Body = $"Your interview (Round {i.RoundNumber}) for {a.Vacancy!.Title} has been cancelled.",
                SentAt = DateTime.UtcNow
            };
        }
    }
}