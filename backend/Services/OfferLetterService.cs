using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IOfferLetterService
    {
        string FillTemplate(string templateHtml, Dictionary<string, string> values);
        OfferLetterResponse MapToResponse(OfferLetter o, Application a);
      }

    public class OfferLetterService : IOfferLetterService
    {
        public string FillTemplate(string templateHtml, Dictionary<string, string> values)
        {
            var result = templateHtml;
            foreach (var kvp in values)
            {
                result = result.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
            }
            return result;
        }

        public OfferLetterResponse MapToResponse(OfferLetter o, Application a)
        {
            return new OfferLetterResponse
            {
                OfferLetterId = o.OfferLetterId,
                ApplicationId = o.ApplicationId,
                CandidateId = a.CandidateId,
                CandidateName = a.Candidate?.User != null
                    ? $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}"
                    : "Unknown",
                VacancyId = a.VacancyId,
                VersionNumber = o.VersionNumber,
                Salary = o.Salary,
                StartDate = o.StartDate,
                ClosingDate = o.ClosingDate,
                JobTitle = o.JobTitle,
                EmploymentType = o.EmploymentType,
                Location = o.Location,
                GeneratedHtml = o.GeneratedHtml,
                Status = o.Status.ToString(),
                SentAt = o.SentAt,
                RespondedAt = o.RespondedAt
            };
        }
}
}