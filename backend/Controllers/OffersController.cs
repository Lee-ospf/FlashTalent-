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
    [Route("api/offers")]
    [Authorize]
    public class OffersController : TalentHubControllerBase
    {
        private readonly IOfferLetterService _offerService;

        public OffersController(AppDbContext db, IOfferLetterService offerService) : base(db)
        {
            _offerService = offerService;
        }

        // POST api/offers/template
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("template")]
        public async Task<ActionResult<OfferLetterTemplateResponse>> UploadTemplate(CreateOfferTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.HtmlContent))
            {
                return BadRequest(new { message = "Template content cannot be empty." });
            }

            var template = new OfferLetterTemplate
            {
                HtmlContent = request.HtmlContent,
                UploadedByUserId = CurrentUserId,
                UploadedAt = DateTime.UtcNow
            };

            Db.OfferLetterTemplates.Add(template);
            await Db.SaveChangesAsync();

            return Ok(new OfferLetterTemplateResponse
            {
                OfferLetterTemplateId = template.OfferLetterTemplateId,
                HtmlContent = template.HtmlContent,
                UploadedAt = template.UploadedAt
            });
        }

        // GET api/offers/template
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("template")]
        public async Task<ActionResult<OfferLetterTemplateResponse>> GetTemplate()
        {
            var template = await Db.OfferLetterTemplates
                .OrderByDescending(t => t.UploadedAt)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return NotFound(new { message = "No offer letter template has been created yet." });
            }

            return Ok(new OfferLetterTemplateResponse
            {
                OfferLetterTemplateId = template.OfferLetterTemplateId,
                HtmlContent = template.HtmlContent,
                UploadedAt = template.UploadedAt
            });
        }

        // POST api/offers/{applicationId}/generate
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("{applicationId}/generate")]
        public async Task<ActionResult<OfferLetterResponse>> Generate(int applicationId, GenerateOfferRequest request)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            if (application.Status != ApplicationStatus.OfferExtended)
            {
                return BadRequest(new { message = "An offer letter can only be generated once the application is in OfferExtended status." });
            }

            var existingOffers = await Db.OfferLetters
                .Where(o => o.ApplicationId == applicationId)
                .OrderBy(o => o.VersionNumber)
                .ToListAsync();

            var latest = existingOffers.LastOrDefault();
            if (latest != null && latest.Status == OfferLetterStatus.Accepted)
            {
                return Conflict(new { message = "This offer has already been accepted. No further offer letters can be generated." });
            }

            var template = await Db.OfferLetterTemplates
                .OrderByDescending(t => t.UploadedAt)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return BadRequest(new { message = "No offer letter template has been created yet." });
            }

            var jobTitle = request.JobTitle ?? application.Vacancy.Title;
            var employmentType = request.EmploymentType ?? application.Vacancy.EmploymentType.ToString();
            var location = request.Location ?? application.Vacancy.Location;
            var candidateName = application.Candidate.User != null
                ? $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}"
                : "Candidate";

            var placeholders = new Dictionary<string, string>
            {
                ["CandidateName"] = candidateName,
                ["JobTitle"] = jobTitle,
                ["Salary"] = request.Salary.ToString("N2"),
                ["StartDate"] = request.StartDate.ToString("d"),
                ["Location"] = location,
                ["EmploymentType"] = employmentType,
                ["ClosingDate"] = request.ClosingDate.ToString("d")
            };

            var generatedHtml = _offerService.FillTemplate(template.HtmlContent, placeholders);

            var offer = new OfferLetter
            {
                ApplicationId = applicationId,
                VersionNumber = existingOffers.Count + 1,
                Salary = request.Salary,
                StartDate = request.StartDate,
                ClosingDate = request.ClosingDate,
                JobTitle = jobTitle,
                EmploymentType = employmentType,
                Location = location,
                GeneratedHtml = generatedHtml,
                Status = OfferLetterStatus.Sent,
                SentByUserId = CurrentUserId,
                SentAt = DateTime.UtcNow
            };

            Db.OfferLetters.Add(offer);

            var notification = _offerService.BuildSentNotification(application, offer);
            Db.Notifications.Add(notification);

            await Db.SaveChangesAsync();

            return Ok(_offerService.MapToResponse(offer, application));
        }

        // GET api/offers/{applicationId}/latest
        [HttpGet("{applicationId}/latest")]
        public async Task<ActionResult<OfferLetterResponse>> GetLatest(int applicationId)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            var latest = await Db.OfferLetters
                .Where(o => o.ApplicationId == applicationId)
                .OrderByDescending(o => o.VersionNumber)
                .FirstOrDefaultAsync();

            if (latest == null)
            {
                return NotFound(new { message = "No offer letter has been generated for this application." });
            }

            return Ok(_offerService.MapToResponse(latest, application));
        }

        // GET api/offers/{applicationId}
        [HttpGet("{applicationId}")]
        public async Task<ActionResult<List<OfferLetterResponse>>> GetHistory(int applicationId)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            var offers = await Db.OfferLetters
                .Where(o => o.ApplicationId == applicationId)
                .OrderBy(o => o.VersionNumber)
                .ToListAsync();

            var result = offers.Select(o => _offerService.MapToResponse(o, application)).ToList();
            return Ok(result);
        }

        // PUT api/offers/{offerLetterId}/respond
        [Authorize(Roles = "Candidate")]
        [HttpPut("{offerLetterId}/respond")]
        public async Task<ActionResult<OfferLetterResponse>> Respond(int offerLetterId, RespondToOfferRequest request)
        {
            var offer = await Db.OfferLetters
                .Include(o => o.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(o => o.Application).ThenInclude(a => a!.Vacancy).ThenInclude(v => v!.Recruiter)
                .FirstOrDefaultAsync(o => o.OfferLetterId == offerLetterId);

            if (offer == null || offer.Application?.Candidate == null)
            {
                return NotFound(new { message = $"No offer letter found with id {offerLetterId}." });
            }

            if (offer.Application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            var latestVersion = await Db.OfferLetters
                .Where(o => o.ApplicationId == offer.ApplicationId)
                .MaxAsync(o => o.VersionNumber);

            if (offer.VersionNumber != latestVersion)
            {
                return BadRequest(new { message = "This is not the latest offer letter version. Please respond to the current offer." });
            }

            if (offer.Status != OfferLetterStatus.Sent)
            {
                return BadRequest(new { message = $"Cannot respond - this offer's status is already '{offer.Status}'." });
            }

            if (!Enum.TryParse<OfferLetterStatus>(request.Response, true, out var response) ||
                (response != OfferLetterStatus.Accepted && response != OfferLetterStatus.Declined))
            {
                return BadRequest(new { message = "Response must be 'Accepted' or 'Declined'." });
            }

            offer.Status = response;
            offer.RespondedAt = DateTime.UtcNow;

            var notification = _offerService.BuildRespondedNotification(offer.Application, offer);
            Db.Notifications.Add(notification);

            await Db.SaveChangesAsync();

            return Ok(_offerService.MapToResponse(offer, offer.Application));
        }

        // GET api/offers/{applicationId}/latest/download
        // STUB - PDF generation library not yet decided (team is checking what's already in use
        // elsewhere in the project before picking one - see conversation history). Wire this up
        // once that's confirmed; the OfferLetter row already has everything needed (GeneratedHtml,
        // Salary, StartDate, etc.) to generate a PDF once a library is chosen.
        [HttpGet("{applicationId}/latest/download")]
        public IActionResult DownloadLatest(int applicationId)
        {
            return StatusCode(501, new { message = "PDF download is not yet implemented." });
        }
    }
}
