using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IPrescreeningService
    {
        PrescreeningResponse MapToResponse(Prescreening p, Application a);
    }

    public class PrescreeningService : IPrescreeningService
    {
        private readonly AppDbContext _db;

        public PrescreeningService(AppDbContext db)
        {
            _db = db;
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