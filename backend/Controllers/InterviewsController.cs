using System.Net.Mail;
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
        private readonly INotificationService _notificationService;
        private readonly IGoogleCalendarService _calendarService;

        public InterviewsController(
            AppDbContext db,
            IInterviewService interviewService,
            IApplicationStatusRules statusRules,
            INotificationService notificationService,
            IGoogleCalendarService calendarService) : base(db)
        {
            _interviewService = interviewService;
            _statusRules = statusRules;
            _notificationService = notificationService;
            _calendarService = calendarService;
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

            if (!Enum.TryParse<InterviewCategory>(request.InterviewCategory, true, out var category))
            {
                var validCategories = string.Join(", ", Enum.GetNames(typeof(InterviewCategory)));
                return BadRequest(new { message = $"Invalid interviewCategory '{request.InterviewCategory}'. Valid values: {validCategories}." });
            }

            if (type == InterviewType.InPerson && string.IsNullOrWhiteSpace(request.Location))
            {
                return BadRequest(new { message = "Location is required for an InPerson interview." });
            }
            if (type == InterviewType.Virtual && string.IsNullOrWhiteSpace(request.MeetingLink))
            {
                return BadRequest(new { message = "MeetingLink is required for a Virtual interview." });
            }

            if (!TryNormalizeGuestEmails(request.GuestEmails, out var guestEmails, out var guestError))
            {
                return BadRequest(new { message = guestError });
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

            var durationMinutes = request.DurationMinutes > 0 ? request.DurationMinutes : 60;
            var proposedEnd = request.ScheduledAt.AddMinutes(durationMinutes);

            // Calendar availability check (Acceptance Criteria #4): if the scheduling
            // recruiter has a connected calendar and it shows a conflict, notify them
            // instead of silently double-booking. They can resubmit with
            // IgnoreCalendarConflicts = true to proceed anyway.
            if (!request.IgnoreCalendarConflicts)
            {
                var conflicts = await _calendarService.CheckAvailabilityAsync(CurrentUserId, request.ScheduledAt, proposedEnd);
                if (conflicts.Count > 0)
                {
                    return Conflict(new
                    {
                        message = "You have a conflicting event on your Google Calendar at this time.",
                        conflicts = conflicts.Select(c => new { conflictStart = c.Start, conflictEnd = c.End })
                    });
                }
            }

            var interview = new Interview
            {
                ApplicationId = applicationId,
                RoundNumber = nextRound,
                InterviewType = type,
                InterviewCategory = category,
                ScheduledAt = request.ScheduledAt,
                DurationMinutes = durationMinutes,
                Location = type == InterviewType.InPerson ? request.Location : null,
                MeetingLink = type == InterviewType.Virtual ? request.MeetingLink : null,
                AdditionalGuestEmails = guestEmails.Count > 0 ? string.Join(";", guestEmails) : null,
                Status = InterviewStatus.Scheduled,
                ScheduledByUserId = CurrentUserId,
                CreatedAt = DateTime.UtcNow
            };

            Db.Interviews.Add(interview);
            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = application.Candidate!.UserId,
                Type = NotificationType.InterviewScheduled,
                TemplateData = new()
                {
                    ["RoundNumber"] = interview.RoundNumber.ToString(),
                    ["ScheduledAt"] = interview.ScheduledAt.ToString("f"),
                    ["VacancyTitle"] = application.Vacancy!.Title
                }
            });
            Db.Notifications.AddRange(notifications);

            if (nextRound == 1)
            {
                await _statusRules.TransitionAsync(application, ApplicationStatus.InterviewStage, CurrentUserId);
            }

            await Db.SaveChangesAsync();

            // Create the matching Google Calendar event (Acceptance Criteria #1-3, #8-10).
            // This never blocks the interview from being scheduled: TalentHub's existing
            // scheduling flow (#11) succeeds regardless of calendar outcome, and the
            // integration status/error is surfaced back to Angular on the response.
            await TrySyncCalendarCreateAsync(interview, application);
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
                .Include(i => i.ScheduledByUser)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            if (interview.Status != InterviewStatus.Scheduled)
            {
                return BadRequest(new { message = $"Cannot reschedule - current status is '{interview.Status}'." });
            }

            // InterviewType is optional on reschedule - if the recruiter doesn't
            // send one, keep the interview's current type. If they do, switch to it.
            var effectiveType = interview.InterviewType;
            if (!string.IsNullOrWhiteSpace(request.InterviewType))
            {
                if (!Enum.TryParse<InterviewType>(request.InterviewType, true, out var parsedType))
                {
                    var validTypes = string.Join(", ", Enum.GetNames(typeof(InterviewType)));
                    return BadRequest(new { message = $"Invalid interviewType '{request.InterviewType}'. Valid values: {validTypes}." });
                }
                effectiveType = parsedType;
            }

            if (effectiveType == InterviewType.InPerson && string.IsNullOrWhiteSpace(request.Location))
            {
                return BadRequest(new { message = "Location is required for an InPerson interview." });
            }
            if (effectiveType == InterviewType.Virtual && string.IsNullOrWhiteSpace(request.MeetingLink))
            {
                return BadRequest(new { message = "MeetingLink is required for a Virtual interview." });
            }
            if (string.IsNullOrWhiteSpace(request.RescheduleReason))
            {
                return BadRequest(new { message = "A reason is required when rescheduling an interview." });
            }

            // Null means "leave the guest list as it is"; an explicit (possibly
            // empty) list replaces it.
            List<string>? guestEmails = null;
            if (request.GuestEmails != null)
            {
                if (!TryNormalizeGuestEmails(request.GuestEmails, out guestEmails, out var guestError))
                {
                    return BadRequest(new { message = guestError });
                }
            }

            var effectiveDuration = request.DurationMinutes is > 0 ? request.DurationMinutes.Value : interview.DurationMinutes;
            var proposedEnd = request.ScheduledAt.AddMinutes(effectiveDuration);

            if (!request.IgnoreCalendarConflicts)
            {
                var conflicts = await _calendarService.CheckAvailabilityAsync(interview.ScheduledByUserId, request.ScheduledAt, proposedEnd);
                if (conflicts.Count > 0)
                {
                    return Conflict(new
                    {
                        message = "You have a conflicting event on your Google Calendar at this time.",
                        conflicts = conflicts.Select(c => new { conflictStart = c.Start, conflictEnd = c.End })
                    });
                }
            }

            var oldScheduledAt = interview.ScheduledAt;   // capture before overwrite

            //set new date and type
            interview.ScheduledAt = request.ScheduledAt;
            interview.DurationMinutes = effectiveDuration;
            interview.InterviewType = effectiveType;
            // Clear whichever field no longer applies when the type changes, so a
            interview.Location = effectiveType == InterviewType.InPerson ? request.Location : null;
            interview.MeetingLink = effectiveType == InterviewType.Virtual ? request.MeetingLink : null;
            if (guestEmails != null)
            {
                interview.AdditionalGuestEmails = guestEmails.Count > 0 ? string.Join(";", guestEmails) : null;
            }

            Db.InterviewRescheduleHistories.Add(new InterviewRescheduleHistory
            {
                InterviewId = interview.InterviewId,
                OldScheduledAt = oldScheduledAt,
                NewScheduledAt = request.ScheduledAt,
                Reason = request.RescheduleReason,
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });
            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = interview.Application!.Candidate!.UserId,
                Type = NotificationType.InterviewRescheduled,
                TemplateData = new()
                {
                    ["VacancyTitle"] = interview.Application.Vacancy!.Title,
                    ["ScheduledAt"] = interview.ScheduledAt.ToString("f")
                }
            });
            Db.Notifications.AddRange(notifications);
            await Db.SaveChangesAsync();

            // Update the existing calendar event using its stored CalendarEventId
            // (Acceptance Criteria #5) rather than creating a new one. If there was no
            // event yet (e.g. calendar wasn't connected at schedule time, or creation
            // previously failed), try creating it now instead.
            if (string.IsNullOrEmpty(interview.CalendarEventId))
            {
                await TrySyncCalendarCreateAsync(interview, interview.Application);
            }
            else
            {
                await TrySyncCalendarUpdateAsync(interview, interview.Application);
            }
            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }
        //Get reschedules for a specific interview
        // GET api/interviews/{interviewId}/reschedules
        [HttpGet("interviews/{interviewId}/reschedules")]
        public async Task<ActionResult<List<InterviewRescheduleResponse>>> GetRescheduleHistory(int interviewId)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application?.Candidate == null)
                return NotFound(new { message = $"No interview found with id {interviewId}." });

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && interview.Application.Candidate.UserId != CurrentUserId)
                return Forbid();

            var history = await Db.InterviewRescheduleHistories
                .Include(h => h.ChangedByUser)
                .Where(h => h.InterviewId == interviewId)
                .OrderBy(h => h.ChangedAt)
                .Select(h => new InterviewRescheduleResponse
                {
                    OldScheduledAt = h.OldScheduledAt,
                    NewScheduledAt = h.NewScheduledAt,
                    Reason = h.Reason,
                    ChangedByName = h.ChangedByUser != null ? $"{h.ChangedByUser.FirstName} {h.ChangedByUser.LastName}" : "Unknown",
                    ChangedAt = h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
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

            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = interview.Application!.Candidate!.UserId,
                Type = NotificationType.InterviewCancelled,
                TemplateData = new()
                {
                    ["RoundNumber"] = interview.RoundNumber.ToString(),
                    ["VacancyTitle"] = interview.Application.Vacancy!.Title
                }
            });
            Db.Notifications.AddRange(notifications);
            await Db.SaveChangesAsync();

            await TrySyncCalendarCancelAsync(interview);
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

        // GET api/interviews/availability?scheduledAt=2026-09-20T10:00:00Z&durationMinutes=60
        // Lets Angular pre-check the current recruiter's calendar before submitting Schedule/Reschedule.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("interviews/availability")]
        public async Task<ActionResult<CalendarAvailabilityResponse>> CheckAvailability(
            [FromQuery] DateTime scheduledAt, [FromQuery] int durationMinutes = 60)
        {
            var isConnected = await _calendarService.IsConnectedAsync(CurrentUserId);
            var conflicts = await _calendarService.CheckAvailabilityAsync(
                CurrentUserId, scheduledAt, scheduledAt.AddMinutes(durationMinutes <= 0 ? 60 : durationMinutes));

            return Ok(new CalendarAvailabilityResponse
            {
                CalendarConnected = isConnected,
                IsAvailable = conflicts.Count == 0,
                Conflicts = conflicts.Select(c => new CalendarConflictDto { ConflictStart = c.Start, ConflictEnd = c.End }).ToList()
            });
        }

        // POST api/interviews/{interviewId}/calendar/retry
        // Lets the recruiter retry calendar integration after a previous failure
        // (Acceptance Criteria #10), without creating a duplicate event.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("interviews/{interviewId}/calendar/retry")]
        public async Task<ActionResult<InterviewResponse>> RetryCalendarSync(int interviewId)
        {
            var interview = await Db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate).ThenInclude(c => c!.User)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .Include(i => i.ScheduledByUser)
                .FirstOrDefaultAsync(i => i.InterviewId == interviewId);

            if (interview == null || interview.Application == null)
            {
                return NotFound(new { message = $"No interview found with id {interviewId}." });
            }

            if (interview.Status == InterviewStatus.Cancelled)
            {
                await TrySyncCalendarCancelAsync(interview);
            }
            else if (string.IsNullOrEmpty(interview.CalendarEventId))
            {
                await TrySyncCalendarCreateAsync(interview, interview.Application);
            }
            else
            {
                await TrySyncCalendarUpdateAsync(interview, interview.Application);
            }

            await Db.SaveChangesAsync();

            return Ok(_interviewService.MapToResponse(interview, interview.Application));
        }

        // Trims, dedupes (case-insensitive) and validates a list of guest email
        // addresses the organizer wants added to the calendar invite. Returns
        // false with a message if any entry isn't a valid email address.
        private static bool TryNormalizeGuestEmails(List<string>? rawEmails, out List<string> emails, out string? error)
        {
            emails = new List<string>();
            error = null;

            if (rawEmails == null || rawEmails.Count == 0)
            {
                return true;
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var raw in rawEmails)
            {
                var email = raw?.Trim();
                if (string.IsNullOrEmpty(email)) continue;

                try
                {
                    _ = new MailAddress(email);
                }
                catch (FormatException)
                {
                    error = $"'{email}' is not a valid guest email address.";
                    return false;
                }

                if (seen.Add(email))
                {
                    emails.Add(email);
                }
            }

            return true;
        }

        // --- Calendar sync helpers -------------------------------------------------
        // Each wraps the corresponding IGoogleCalendarService call so a calendar-side
        // failure (bad token, API outage, etc.) never throws out of the request and
        // never blocks the underlying interview action (Acceptance Criteria #10, #11).
        // Caller is responsible for SaveChangesAsync afterwards.

        private async Task TrySyncCalendarCreateAsync(Interview interview, Application application)
        {
            try
            {
                var calendarEvent = await _calendarService.CreateEventForInterviewAsync(interview, application);
                if (calendarEvent != null)
                {
                    interview.CalendarEventId = calendarEvent.Value.EventId;
                    interview.CalendarProvider = "Google";
                    interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Created;
                    interview.CalendarIntegrationError = null;
                }
                else
                {
                    // Recruiter simply hasn't connected a calendar - not an error.
                    interview.CalendarIntegrationStatus = CalendarIntegrationStatus.NotIntegrated;
                    interview.CalendarIntegrationError = null;
                }
            }
            catch (Exception ex)
            {
                interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Failed;
                interview.CalendarIntegrationError = ex.Message;
            }
        }

        private async Task TrySyncCalendarUpdateAsync(Interview interview, Application application)
        {
            try
            {
                await _calendarService.UpdateEventForInterviewAsync(interview, application);
                interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Updated;
                interview.CalendarIntegrationError = null;
            }
            catch (Exception ex)
            {
                interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Failed;
                interview.CalendarIntegrationError = ex.Message;
            }
        }

        private async Task TrySyncCalendarCancelAsync(Interview interview)
        {
            try
            {
                await _calendarService.CancelEventForInterviewAsync(interview);
                interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Cancelled;
                interview.CalendarIntegrationError = null;
            }
            catch (Exception ex)
            {
                interview.CalendarIntegrationStatus = CalendarIntegrationStatus.Failed;
                interview.CalendarIntegrationError = ex.Message;
            }
        }
    }

    
    }