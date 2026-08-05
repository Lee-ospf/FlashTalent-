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
        Notification BuildSentNotification(Application a, OfferLetter o);
        Notification BuildRespondedNotification(Application a, OfferLetter o);
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

        public Notification BuildSentNotification(Application a, OfferLetter o)
        {
            return new Notification
            {
                UserId = a.Candidate!.UserId,
                NotificationType = NotificationType.OfferSent,
                Subject = "Offer letter sent",
                Body = $"An offer letter for {o.JobTitle} has been sent. Please review and respond by {o.ClosingDate:d}.",
                SentAt = DateTime.UtcNow
            };
        }

        public Notification BuildRespondedNotification(Application a, OfferLetter o)
        {
            return new Notification
            {
                UserId = a.Vacancy!.Recruiter!.UserId,
                NotificationType = NotificationType.OfferResponded,
                Subject = "Offer letter response",
                Body = $"{(a.Candidate!.User != null ? $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}" : "The candidate")} has {o.Status} the offer for {o.JobTitle}.",
                SentAt = DateTime.UtcNow
            };
        }
    }
}