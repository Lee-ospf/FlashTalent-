using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IInterviewService
    {
        InterviewResponse MapToResponse(Interview i, Application a);
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

      
    }
}