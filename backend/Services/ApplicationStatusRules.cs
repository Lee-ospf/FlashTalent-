using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IApplicationStatusRules
    {
        bool IsValidTransition(ApplicationStatus from, ApplicationStatus to);

        // The single place status changes, history writes, and Talent Pool hooks
        // happen - reused by Applications, Prescreening, and Interviews controllers
        // so none of them duplicate this logic. Caller is still responsible for
        
        Task TransitionAsync(Application application, ApplicationStatus newStatus, int changedByUserId);
    }

    public class ApplicationStatusRules : IApplicationStatusRules
    {
        private readonly AppDbContext _db;
        private readonly ITalentPoolService _talentPoolService;

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
                ApplicationStatus.PrescreeningStage,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.PrescreeningStage] = new[]
            {
                ApplicationStatus.InterviewStage,
                ApplicationStatus.NotSelected
            },
            [ApplicationStatus.InterviewStage] = new[]
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

        public ApplicationStatusRules(AppDbContext db, ITalentPoolService talentPoolService)
        {
            _db = db;
            _talentPoolService = talentPoolService;
        }

        public bool IsValidTransition(ApplicationStatus from, ApplicationStatus to)
        {
            if (from == to) return false;
            return AllowedTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);
        }

        public async Task TransitionAsync(Application application, ApplicationStatus newStatus, int changedByUserId)
        {
            var oldStatus = application.Status;

            if (!IsValidTransition(oldStatus, newStatus))
            {
                // Defensive - callers should already be gating this, so hitting this
                // means a bug in the calling controller's own guard logic.
                throw new InvalidOperationException(
                    $"Cannot transition application {application.ApplicationId} from '{oldStatus}' to '{newStatus}'.");
            }

            application.Status = newStatus;
            application.UpdatedAt = DateTime.UtcNow;

            _db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                ChangedByUserId = changedByUserId,
                ChangedAt = DateTime.UtcNow
            });

            if (newStatus == ApplicationStatus.NotSelected)
            {
                await _talentPoolService.AddOrUpdateAsync(application.CandidateId, application.VacancyId);
            }
        }
    }
}