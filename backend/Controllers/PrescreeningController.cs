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
    [Route("api/prescreening")]
    [Authorize]
    public class PrescreeningController : TalentHubControllerBase
    {
        private readonly IPrescreeningService _prescreeningService;
        private readonly IWebHostEnvironment _env;
        private readonly IApplicationStatusRules _statusRules;

        // Same conventions as CandidateDocumentsController - keep in sync if those change.
        private static readonly string[] AllowedExtensions = { ".pdf", ".doc", ".docx" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public PrescreeningController(
     AppDbContext db,
     IPrescreeningService prescreeningService,
     IWebHostEnvironment env,
     IApplicationStatusRules statusRules) : base(db)
        {
            _prescreeningService = prescreeningService;
            _env = env;
            _statusRules = statusRules;
        }

        // POST api/prescreening/template
        // Recruiter/Admin uploads a new global template. Old ones are kept for audit history;
        // GET always returns the most recently uploaded one.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("template")]
        [RequestSizeLimit(MaxFileSizeBytes + 1024)]
        public async Task<ActionResult<PrescreeningTemplateResponse>> UploadTemplate(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = $"File exceeds the maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    message = $"File type '{extension}' is not allowed. Accepted types: {string.Join(", ", AllowedExtensions)}."
                });
            }

            var uploadsRoot = Path.Combine(_env.ContentRootPath, "Uploads", "prescreening-template");
            Directory.CreateDirectory(uploadsRoot);

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(uploadsRoot, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var template = new PrescreeningTemplate
            {
                FileUrl = $"/Uploads/prescreening-template/{uniqueFileName}",
                OriginalFileName = file.FileName,
                UploadedByUserId = CurrentUserId,
                UploadedAt = DateTime.UtcNow
            };

            Db.PrescreeningTemplates.Add(template);
            await Db.SaveChangesAsync();

            return Ok(new PrescreeningTemplateResponse
            {
                PrescreeningTemplateId = template.PrescreeningTemplateId,
                FileUrl = template.FileUrl,
                OriginalFileName = template.OriginalFileName,
                UploadedAt = template.UploadedAt
            });
        }

        // GET api/prescreening/template
        // Any authenticated user (candidate needs this to download the blank form).
        [HttpGet("template")]
        public async Task<ActionResult<PrescreeningTemplateResponse>> GetTemplate()
        {
            var template = await Db.PrescreeningTemplates
                .OrderByDescending(t => t.UploadedAt)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return NotFound(new { message = "No pre-screening template has been uploaded yet." });
            }

            return Ok(new PrescreeningTemplateResponse
            {
                PrescreeningTemplateId = template.PrescreeningTemplateId,
                FileUrl = template.FileUrl,
                OriginalFileName = template.OriginalFileName,
                UploadedAt = template.UploadedAt
            });
        }

        // POST api/prescreening/{applicationId}/send
        // Recruiter/Admin. Application must be Shortlisted. Creates the Prescreening row and notifies the candidate.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("{applicationId}/send")]
        public async Task<ActionResult<PrescreeningResponse>> Send(int applicationId)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Include(a => a.Prescreening)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            if (application.Status != ApplicationStatus.Shortlisted)
            {
                return BadRequest(new { message = "A pre-screening form can only be sent once the candidate is Shortlisted." });
            }

            if (application.Prescreening != null)
            {
                return Conflict(new { message = "A pre-screening form has already been sent for this application." });
            }

            var templateExists = await Db.PrescreeningTemplates.AnyAsync();
            if (!templateExists)
            {
                return BadRequest(new { message = "No pre-screening template has been uploaded yet. Upload one before sending." });
            }

            var prescreening = new Prescreening
            {
                ApplicationId = applicationId,
                Status = PrescreeningStatus.Sent,
                SentAt = DateTime.UtcNow
            };

            Db.Prescreenings.Add(prescreening);

            var notification = await _prescreeningService.BuildSentNotification(application);
            Db.Notifications.Add(notification);

            await _statusRules.TransitionAsync(application, ApplicationStatus.PrescreeningStage, CurrentUserId);
            await Db.SaveChangesAsync();

            return Ok(_prescreeningService.MapToResponse(prescreening, application));
        }

        // POST api/prescreening/{applicationId}/submit
        // Candidate only, must own the application. Uploads the completed file.
        [Authorize(Roles = "Candidate")]
        [HttpPost("{applicationId}/submit")]
        [RequestSizeLimit(MaxFileSizeBytes + 1024)]
        public async Task<ActionResult<PrescreeningResponse>> Submit(int applicationId, IFormFile file)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy).ThenInclude(v => v!.Recruiter)
                .Include(a => a.Prescreening)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            if (application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            if (application.Prescreening == null)
            {
                return BadRequest(new { message = "No pre-screening form has been sent for this application yet." });
            }

            if (application.Prescreening.Status != PrescreeningStatus.Sent)
            {
                return BadRequest(new { message = $"Cannot submit - current status is '{application.Prescreening.Status}'." });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = $"File exceeds the maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    message = $"File type '{extension}' is not allowed. Accepted types: {string.Join(", ", AllowedExtensions)}."
                });
            }

            // Reuse the same per-candidate folder convention as CandidateDocumentsController
            var uploadsRoot = Path.Combine(_env.ContentRootPath, "Uploads", application.CandidateId.ToString());
            Directory.CreateDirectory(uploadsRoot);

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(uploadsRoot, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            application.Prescreening.CompletedFileUrl = $"/Uploads/{application.CandidateId}/{uniqueFileName}";
            application.Prescreening.CompletedOriginalFileName = file.FileName;
            application.Prescreening.SubmittedAt = DateTime.UtcNow;
            application.Prescreening.Status = PrescreeningStatus.Submitted;

            var notification = await _prescreeningService.BuildSubmittedNotification(application);
            Db.Notifications.Add(notification);

            await Db.SaveChangesAsync();

            return Ok(_prescreeningService.MapToResponse(application.Prescreening, application));
        }

        // GET api/prescreening/{applicationId}
        // Candidate (owner) or Recruiter/Admin.
        [HttpGet("{applicationId}")]
        public async Task<ActionResult<PrescreeningResponse>> GetByApplication(int applicationId)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Include(a => a.Prescreening)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            if (application.Prescreening == null)
            {
                return NotFound(new { message = "No pre-screening form has been sent for this application." });
            }

            return Ok(_prescreeningService.MapToResponse(application.Prescreening, application));
        }

        // PUT api/prescreening/{applicationId}/outcome
        // Recruiter/Admin only.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("{applicationId}/outcome")]
        public async Task<ActionResult<PrescreeningResponse>> SetOutcome(int applicationId, SetPrescreeningOutcomeRequest request)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Include(a => a.Prescreening)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            if (application.Prescreening == null)
            {
                return BadRequest(new { message = "No pre-screening form exists for this application." });
            }

            if (application.Prescreening.Status != PrescreeningStatus.Submitted)
            {
                return BadRequest(new { message = $"Cannot review - current status is '{application.Prescreening.Status}'. The candidate must submit first." });
            }

            if (!Enum.TryParse<PrescreeningOutcome>(request.Outcome, true, out var outcome) || outcome == PrescreeningOutcome.Pending)
            {
                return BadRequest(new { message = "Outcome must be 'Passed' or 'Failed'." });
            }

            application.Prescreening.Outcome = outcome;
            application.Prescreening.RecruiterNotes = request.RecruiterNotes;
            application.Prescreening.ReviewedAt = DateTime.UtcNow;
            application.Prescreening.Status = PrescreeningStatus.Reviewed;

            if (outcome == PrescreeningOutcome.Failed)   
            {
                await _statusRules.TransitionAsync(application, ApplicationStatus.NotSelected, CurrentUserId);
            }

            await Db.SaveChangesAsync();

            return Ok(_prescreeningService.MapToResponse(application.Prescreening, application));
        }
    }
}