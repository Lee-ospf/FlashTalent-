using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ApplicationsController : TalentHubControllerBase
    {
        private readonly IDocumentValidationService _docValidation;
        private readonly IApplicationStatusRules _statusRules;

        public ApplicationsController(
            AppDbContext db,
            IDocumentValidationService docValidation,
            IApplicationStatusRules statusRules) : base(db)
        {
            _docValidation = docValidation;
            _statusRules = statusRules;
        }

        // POST api/applications
        // Candidate applies for THEMSELVES only - CandidateId in the body must match the logged-in candidate.
        [Authorize(Roles = "Candidate")]
        [HttpPost]
        public async Task<ActionResult<ApplicationResponse>> Apply(CreateApplicationRequest request)
        {
            var candidate = await Db.Candidates
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.CandidateId == request.CandidateId);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {request.CandidateId}." });
            }

            if (candidate.UserId != CurrentUserId)
            {
                return Forbid(); // can't apply on someone else's behalf
            }

            var vacancy = await Db.Vacancies.FindAsync(request.VacancyId);
            if (vacancy == null)
            {
                return NotFound(new { message = $"No vacancy found with VacancyId {request.VacancyId}." });
            }
            //validation for vacancy that is not puplished or closed 
            if (vacancy.Status != VacancyStatus.Published)
            {
                return BadRequest(new { message = "Cannot apply to a vacancy that has not been published." });
            }

            if (vacancy.ClosingDate.HasValue && vacancy.ClosingDate.Value < DateTime.UtcNow)
            {
                return BadRequest(new { message = "This vacancy's closing date has passed." });
            }
            var duplicateExists = await Db.Applications
                .AnyAsync(a => a.CandidateId == request.CandidateId && a.VacancyId == request.VacancyId);
            if (duplicateExists)
            {
                return Conflict(new { message = "This candidate has already applied to this vacancy." });
            }

            var requiredDocTypes = await Db.Set<VacancyDocument>()
     .Where(vd => vd.VacancyId == request.VacancyId && vd.IsMandatory)
     .Select(vd => vd.DocumentType)
     .ToListAsync();

            if (requiredDocTypes.Count > 0)
            {
                var candidateUploadedTypes = await Db.CandidateDocuments
                    .Where(cd => cd.CandidateId == request.CandidateId)
                    .Select(cd => cd.DocumentType)
                    .ToListAsync();

                var missingTypes = requiredDocTypes
                    .Where(rt => !candidateUploadedTypes.Contains(rt))
                    .Select(rt => rt.ToString())
                    .Distinct()
                    .ToList();

                if (missingTypes.Count > 0)
                {
                    return BadRequest(new
                    {
                        message = "Application blocked: this vacancy requires documents that are missing from your profile.",
                        missingDocumentTypes = missingTypes
                    });
                }
            }

            var application = new Application
            {
                CandidateId = request.CandidateId,
                VacancyId = request.VacancyId,
                Status = ApplicationStatus.Applied,
                AppliedAt = DateTime.UtcNow
            };

            Db.Applications.Add(application);
            await Db.SaveChangesAsync();

            // Record the initial state in history too, so the full timeline is visible from the start.
            Db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                OldStatus = ApplicationStatus.Applied,
                NewStatus = ApplicationStatus.Applied,
                ChangedByUserId = candidate.UserId,
                ChangedAt = DateTime.UtcNow
            });
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(application, candidate, vacancy));
        }

        // GET api/applications
        // Recruiter/Admin only - full system-wide application list, used by dashboards
        // and any "all applications" admin views.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet]
        public async Task<ActionResult<List<ApplicationResponse>>> GetAll()
        {
            var applications = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();

            var result = applications
                .Where(a => a.Candidate != null && a.Vacancy != null)
                .Select(a => MapToResponse(a, a.Candidate!, a.Vacancy!))
                .ToList();

            return Ok(result);
        }

        // GET api/applications/{id}
        // Candidate can view their own application; Recruiter/Admin can view any.
        [HttpGet("{id}")]
        public async Task<ActionResult<ApplicationResponse>> GetById(int id)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == id);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {id}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            return Ok(MapToResponse(application, application.Candidate, application.Vacancy));
        }

        // GET api/applications/candidate/{candidateId}
        // Candidate can view their own list; Recruiter/Admin can view any candidate's list.
        [HttpGet("candidate/{candidateId}")]
        public async Task<ActionResult<List<ApplicationResponse>>> GetByCandidate(int candidateId)
        {
            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var applications = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Where(a => a.CandidateId == candidateId)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();

            var result = applications
                .Where(a => a.Candidate != null && a.Vacancy != null)
                .Select(a => MapToResponse(a, a.Candidate!, a.Vacancy!))
                .ToList();

            return Ok(result);
        }

        // GET api/applications/vacancy/{vacancyId}
        // Recruiter/Admin only - viewing everyone who applied to a vacancy.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("vacancy/{vacancyId}")]
        public async Task<ActionResult<List<ApplicationResponse>>> GetByVacancy(int vacancyId)
        {
            var applications = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Where(a => a.VacancyId == vacancyId)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();

            var result = applications
                .Where(a => a.Candidate != null && a.Vacancy != null)
                .Select(a => MapToResponse(a, a.Candidate!, a.Vacancy!))
                .ToList();

            return Ok(result);
        }

        // PUT api/applications/{id}/status
        // Recruiter/Admin only. ChangedByUserId is always the logged-in user - never trusted from the body.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApplicationResponse>> UpdateStatus(int id, UpdateApplicationStatusRequest request)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == id);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {id}." });
            }

            if (!Enum.TryParse<ApplicationStatus>(request.NewStatus, true, out var newStatus))
            {
                var validValues = string.Join(", ", Enum.GetNames(typeof(ApplicationStatus)));
                return BadRequest(new { message = $"Invalid status '{request.NewStatus}'. Valid values: {validValues}." });
            }

            var oldStatus = application.Status;

            if (!_statusRules.IsValidTransition(oldStatus, newStatus))
            {
                return BadRequest(new
                {
                    message = $"Cannot move application from '{oldStatus}' to '{newStatus}'. This is not a valid pipeline transition."
                });
            }

            application.Status = newStatus;
            application.UpdatedAt = DateTime.UtcNow;

            Db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });

            await Db.SaveChangesAsync();

            return Ok(MapToResponse(application, application.Candidate, application.Vacancy));
        }

        // GET api/applications/{id}/history
        // Candidate can view their own application's history; Recruiter/Admin can view any.
        [HttpGet("{id}/history")]
        public async Task<ActionResult<List<ApplicationStatusHistoryResponse>>> GetHistory(int id)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate)
                .FirstOrDefaultAsync(a => a.ApplicationId == id);

            if (application == null || application.Candidate == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {id}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            var history = await Db.ApplicationStatusHistories
                .Include(h => h.ChangedByUser)
                .Where(h => h.ApplicationId == id)
                .OrderBy(h => h.ChangedAt)
                .Select(h => new ApplicationStatusHistoryResponse
                {
                    ApplicationStatusHistoryId = h.ApplicationStatusHistoryId,
                    OldStatus = h.OldStatus.ToString(),
                    NewStatus = h.NewStatus.ToString(),
                    ChangedByName = h.ChangedByUser != null ? $"{h.ChangedByUser.FirstName} {h.ChangedByUser.LastName}" : "Unknown",
                    ChangedAt = h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
        }


        private static ApplicationResponse MapToResponse(Application a, Candidate c, Vacancy v)
        {
            return new ApplicationResponse
            {
                ApplicationId = a.ApplicationId,
                CandidateId = a.CandidateId,
                CandidateName = c.User != null ? $"{c.User.FirstName} {c.User.LastName}" : "Unknown",
                VacancyId = a.VacancyId,
                VacancyTitle = v.Title,
                Status = a.Status.ToString(),
                AppliedAt = a.AppliedAt,
                UpdatedAt = a.UpdatedAt
            };
        }
    }
}