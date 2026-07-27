using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IApplicationStatusRules
    {
        bool IsValidTransition(ApplicationStatus from, ApplicationStatus to);
    }

    public class ApplicationStatusRules : IApplicationStatusRules
    {
        // Defines which statuses can move to which. NotSelected is reachable from
        // any active stage (a candidate can be rejected at any point in the
        // pipeline, per the scope doc: "recruiter to mark candidate as Not Selected
        // at any pipeline stage"). Hired and NotSelected are terminal - no transitions
        // out of them, since the scope doc treats them as end states.
        private static readonly Dictionary<ApplicationStatus, ApplicationStatus[]> AllowedTransitions = new()
        {
            [ApplicationStatus.Applied] = new[]
            {
                ApplicationStatus.UnderReview,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.UnderReview] = new[]
            {
                ApplicationStatus.Shortlisted,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.Shortlisted] = new[]
            {
                ApplicationStatus.OfferExtended,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.OfferExtended] = new[]
            {
                ApplicationStatus.Hired,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.Hired] = Array.Empty<ApplicationStatus>(),
            [ApplicationStatus.NotSelected] = Array.Empty<ApplicationStatus>()
        };

        public bool IsValidTransition(ApplicationStatus from, ApplicationStatus to)
        {
            if (from == to) return false; // no-op changes aren't a "transition"
            return AllowedTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);
        }
    }
}