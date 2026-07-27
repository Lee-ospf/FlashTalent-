using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IPrescreeningService
    {
        Task<Notification> BuildSentNotification(Application application);
        Task<Notification> BuildSubmittedNotification(Application application);
        PrescreeningResponse MapToResponse(Prescreening p, Application a);
    }

    public class PrescreeningService : IPrescreeningService
    {
        private readonly AppDbContext _db;

        public PrescreeningService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Notification> BuildSentNotification(Application application)
        {
            var candidate = await _db.Candidates
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.CandidateId == application.CandidateId);

            var vacancyTitle = application.Vacancy?.Title ?? "the vacancy";

            return new Notification
            {
                UserId = candidate!.UserId,
                NotificationType = NotificationType.PrescreeningSent,
                Subject = "Pre-screening form sent",
                Body = $"A pre-screening form has been sent for your application to {vacancyTitle}. Please download, complete, and upload it.",
                SentAt = DateTime.UtcNow
            };
        }

        public async Task<Notification> BuildSubmittedNotification(Application application)
        {
            var vacancy = await _db.Vacancies
                .Include(v => v.Recruiter)
                .FirstOrDefaultAsync(v => v.VacancyId == application.VacancyId);

            var candidate = await _db.Candidates
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.CandidateId == application.CandidateId);

            var candidateName = candidate?.User != null
                ? $"{candidate.User.FirstName} {candidate.User.LastName}"
                : "A candidate";

            var vacancyTitle = vacancy?.Title ?? "the vacancy";

            return new Notification
            {
                UserId = vacancy!.Recruiter!.UserId,
                NotificationType = NotificationType.PrescreeningSubmitted,
                Subject = "Pre-screening form submitted",
                Body = $"{candidateName} submitted their pre-screening form for {vacancyTitle}.",
                SentAt = DateTime.UtcNow
            };
        }

        public PrescreeningResponse MapToResponse(Prescreening p, Application a)
        {
            return new PrescreeningResponse
            {
                PrescreeningId = p.PrescreeningId,
                ApplicationId = p.ApplicationId,
                CandidateId = a.CandidateId,
                CandidateName = a.Candidate?.User != null
                    ? $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}"
                    : "Unknown",
                VacancyId = a.VacancyId,
                VacancyTitle = a.Vacancy?.Title ?? "Unknown",
                Status = p.Status.ToString(),
                SentAt = p.SentAt,
                CompletedFileUrl = p.CompletedFileUrl,
                CompletedOriginalFileName = p.CompletedOriginalFileName,
                SubmittedAt = p.SubmittedAt,
                Outcome = p.Outcome.ToString(),
                RecruiterNotes = p.RecruiterNotes,
                ReviewedAt = p.ReviewedAt
            };
        }
    }
}