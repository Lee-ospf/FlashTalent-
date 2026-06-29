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
    public class ApplicationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IDocumentValidationService _docValidation;
        private readonly IApplicationStatusRules _statusRules;

        public ApplicationsController(
            AppDbContext db,
            IDocumentValidationService docValidation,
            IApplicationStatusRules statusRules)
        {
            _db = db;
            _docValidation = docValidation;
            _statusRules = statusRules;
        }

        // POST api/applications
        // Blocked if: candidate/vacancy don't exist, vacancy isn't published,
        // mandatory documents are missing, or a duplicate application exists.
        [HttpPost]
        public async Task<ActionResult<ApplicationResponse>> Apply(CreateApplicationRequest request)
        {
            var candidate = await _db.Candidates
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.CandidateId == request.CandidateId);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {request.CandidateId}." });
            }

            var vacancy = await _db.Vacancies.FindAsync(request.VacancyId);
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
            var duplicateExists = await _db.Applications
                .AnyAsync(a => a.CandidateId == request.CandidateId && a.VacancyId == request.VacancyId);
            if (duplicateExists)
            {
                return Conflict(new { message = "This candidate has already applied to this vacancy." });
            }

            var requiredDocTypes = await _db.Set<VacancyDocument>()
     .Where(vd => vd.VacancyId == request.VacancyId && vd.IsMandatory)
     .Select(vd => vd.DocumentType)
     .ToListAsync();

            if (requiredDocTypes.Count > 0)
            {
                var candidateUploadedTypes = await _db.CandidateDocuments
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

            _db.Applications.Add(application);
            await _db.SaveChangesAsync();

            // Record the initial state in history too, so the full timeline is visible from the start.
            _db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                OldStatus = ApplicationStatus.Applied,
                NewStatus = ApplicationStatus.Applied,
                ChangedByUserId = candidate.UserId,
                ChangedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Ok(MapToResponse(application, candidate, vacancy));
        }

        // GET api/applications/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ApplicationResponse>> GetById(int id)
        {
            var application = await _db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == id);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {id}." });
            }

            return Ok(MapToResponse(application, application.Candidate, application.Vacancy));
        }

        // GET api/applications/candidate/{candidateId}
        [HttpGet("candidate/{candidateId}")]
        public async Task<ActionResult<List<ApplicationResponse>>> GetByCandidate(int candidateId)
        {
            var applications = await _db.Applications
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
        [HttpGet("vacancy/{vacancyId}")]
        public async Task<ActionResult<List<ApplicationResponse>>> GetByVacancy(int vacancyId)
        {
            var applications = await _db.Applications
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
        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApplicationResponse>> UpdateStatus(int id, UpdateApplicationStatusRequest request)
        {
            var application = await _db.Applications
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

            var changedByUser = await _db.Users.FindAsync(request.ChangedByUserId);
            if (changedByUser == null)
            {
                return BadRequest(new { message = $"No user found with ChangedByUserId {request.ChangedByUserId}." });
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

            _db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                ChangedByUserId = request.ChangedByUserId,
                ChangedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(MapToResponse(application, application.Candidate, application.Vacancy));
        }

        // GET api/applications/{id}/history
        [HttpGet("{id}/history")]
        public async Task<ActionResult<List<ApplicationStatusHistoryResponse>>> GetHistory(int id)
        {
            var applicationExists = await _db.Applications.AnyAsync(a => a.ApplicationId == id);
            if (!applicationExists)
            {
                return NotFound(new { message = $"No application found with ApplicationId {id}." });
            }

            var history = await _db.ApplicationStatusHistories
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