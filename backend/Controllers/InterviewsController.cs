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
    [Route("api")]
    [Authorize]
    public class InterviewsController : TalentHubControllerBase
    {
        private readonly IInterviewService _interviewService;
        private readonly IApplicationStatusRules _statusRules;

        public InterviewsController(
            AppDbContext db,
            IInterviewService interviewService,
            IApplicationStatusRules statusRules) : base(db)
        {
            _interviewService = interviewService;
            _statusRules = statusRules;
        }

        // POST api/interviews/{applicationId}/schedule
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("interviews/{applicationId}/schedule")]
        public async Task<ActionResult<InterviewResponse>> Schedule(int applicationId, ScheduleInterviewRequest request)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Include(a => a.Prescreening)
                .Include(a => a.Interviews)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null || application.Candidate == null || application.Vacancy == null)
            {
                return NotFound(new { message = $"No application found with ApplicationId {applicationId}." });
            }

            if (!Enum.TryParse<InterviewType>(request.InterviewType, true, out var type))
            {
                var validTypes = string.Join(", ", Enum.GetNames(typeof(InterviewType)));
                return BadRequest(new { message = $"Invalid interviewType '{request.InterviewType}'. Valid values: {validTypes}." });
            }

            if (type == InterviewType.InPerson && string.IsNullOrWhiteSpace(request.Location))
            {
                return BadRequest(new { message = "Location is required for an InPerson interview." });
            }
            if (type == InterviewType.Virtual && string.IsNullOrWhiteSpace(request.MeetingLink))
            {
                return BadRequest(new { message = "MeetingLink is required for a Virtual interview." });
            }

            if (application.Status == ApplicationStatus.NotSelected)
            {
                return BadRequest(new { message = "This application has already been marked NotSelected - no further interviews can be scheduled." });
            }

            var existingRounds = application.Interviews.OrderBy(i => i.RoundNumber).ToList();
            var nextRound = existingRounds.Count + 1;

            if (nextRound == 1)
            {
                if (application.Prescreening == null || application.Prescreening.Outcome != PrescreeningOutcome.Passed)
                {
                    return BadRequest(new { message = "Round 1 can only be scheduled once the candidate has Passed pre-screening." });
                }
            }
            else
            {
                var previousRound = existingRounds.Last();
                if (previousRound.Status != InterviewStatus.Completed || previousRound.Outcome == InterviewOutcome.Pending)
                {
                    return BadRequest(new { message = $"Round {previousRound.RoundNumber} must be Completed with an outcome recorded before scheduling the next round." });
                }
            }

            if (nextRound > InterviewService.MaxRounds)
            {
                return BadRequest(new { message = $"Maximum of {InterviewService.MaxRounds} interview rounds reached for this application." });
            }

            var interview = new Interview
            {
                ApplicationId = applicationId,
                RoundNumber = nextRound,
                InterviewType = type,
                ScheduledAt = request.ScheduledAt,
                Location = type == InterviewType.InPerson ? request.Location : null,
                MeetingLink = type == InterviewType.Virtual ? request.MeetingLink : null,
                Status = InterviewStatus.Scheduled,
                ScheduledByUserId = CurrentUserId,
                CreatedAt = DateTime.UtcNow
            };

            Db.Interviews.Add(interview);

            var notification = _interviewService.BuildScheduledNotification(application, interview);
            Db.Notifications.Add(notification);

            if (nextRound == 1)   
            {
                await _statusRules.TransitionAsync(application, ApplicationStatus.InterviewStage, CurrentUserId);
            }

            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, application));
        }

        // PUT api/interviews/{interviewId}/reschedule
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("interviews/{interviewId}/reschedule")]
        public async Task<ActionResult<InterviewResponse>> Reschedule(int interviewId, RescheduleInterviewRequest request)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            if (interview.Status != InterviewStatus.Scheduled)
            {
                return BadRequest(new { message = $"Cannot reschedule - current status is '{interview.Status}'." });
            }

            if (interview.InterviewType == InterviewType.InPerson && string.IsNullOrWhiteSpace(request.Location))
            {
                return BadRequest(new { message = "Location is required for an InPerson interview." });
            }
            if (interview.InterviewType == InterviewType.Virtual && string.IsNullOrWhiteSpace(request.MeetingLink))
            {
                return BadRequest(new { message = "MeetingLink is required for a Virtual interview." });
            }

            interview.ScheduledAt = request.ScheduledAt;
            if (interview.InterviewType == InterviewType.InPerson) interview.Location = request.Location;
            if (interview.InterviewType == InterviewType.Virtual) interview.MeetingLink = request.MeetingLink;

            var notification = _interviewService.BuildRescheduledNotification(interview.Application, interview);
            Db.Notifications.Add(notification);

            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }

        // PUT api/interviews/{interviewId}/cancel
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("interviews/{interviewId}/cancel")]
        public async Task<ActionResult<InterviewResponse>> Cancel(int interviewId)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            if (interview.Status != InterviewStatus.Scheduled)
            {
                return BadRequest(new { message = $"Cannot cancel - current status is '{interview.Status}'." });
            }

            interview.Status = InterviewStatus.Cancelled;

            var notification = _interviewService.BuildCancelledNotification(interview.Application, interview);
            Db.Notifications.Add(notification);

            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }

        // PUT api/interviews/{interviewId}/outcome
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("interviews/{interviewId}/outcome")]
        public async Task<ActionResult<InterviewResponse>> SetOutcome(int interviewId, SetInterviewOutcomeRequest request)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            if (interview.Status != InterviewStatus.Scheduled)
            {
                return BadRequest(new { message = $"Cannot record outcome - current status is '{interview.Status}'." });
            }

            if (!Enum.TryParse<InterviewOutcome>(request.Outcome, true, out var outcome) || outcome == InterviewOutcome.Pending)
            {
                return BadRequest(new { message = "Outcome must be 'Passed' or 'Failed'." });
            }

            interview.Outcome = outcome;
            interview.RecruiterNotes = request.RecruiterNotes;
            interview.Status = InterviewStatus.Completed;
            interview.CompletedAt = DateTime.UtcNow;

            if (outcome == InterviewOutcome.Failed)   // ADD
            {
                await _statusRules.TransitionAsync(interview.Application, ApplicationStatus.NotSelected, CurrentUserId);
            }

            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }

        // GET api/interviews/{interviewId}
        [HttpGet("interviews/{interviewId}")]
        public async Task<ActionResult<InterviewResponse>> GetById(int interviewId)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application?.Candidate == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && interview.Application.Candidate.UserId != CurrentUserId)
            {
                return Forbid();
            }

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }

        // GET api/applications/{applicationId}/interviews
        [HttpGet("applications/{applicationId}/interviews")]
        public async Task<ActionResult<List<InterviewResponse>>> GetByApplication(int applicationId)
        {
            var application = await Db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .Include(a => a.Interviews)
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

            var result = application.Interviews
                .OrderBy(i => i.RoundNumber)
                .Select(i => _interviewService.MapToResponse(i, application))
                .ToList();

            return Ok(result);
        }
    }
}