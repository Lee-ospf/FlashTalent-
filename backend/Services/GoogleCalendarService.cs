using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Linq;
using TalentHub.Data;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IGoogleCalendarService
    {
        string BuildAuthUrl(int userId);
        Task<string> ConnectAsync(string code, int userId); // returns connected Google account email
        Task<bool> IsConnectedAsync(int userId);

        // Returns busy time blocks for the given user's calendar in the given window.
        // Empty list if the user hasn't connected a calendar (nothing to conflict with).
        Task<List<(DateTime Start, DateTime End)>> CheckAvailabilityAsync(int userId, DateTime startUtc, DateTime endUtc);

        // Returns (eventId, htmlLink) or null if the scheduling user hasn't connected Google Calendar.
        // Safe to call more than once: if the interview already has a CalendarEventId, it is returned
        // as-is rather than creating a duplicate event.
        Task<(string EventId, string HtmlLink)?> CreateEventForInterviewAsync(Interview interview, Application application);
        Task UpdateEventForInterviewAsync(Interview interview, Application application);
        Task CancelEventForInterviewAsync(Interview interview);
    }

    public class GoogleCalendarService : IGoogleCalendarService
    {
        private readonly GoogleCalendarOptions _options;
        private readonly AppDbContext _db;

        public GoogleCalendarService(IOptions<GoogleCalendarOptions> options, AppDbContext db)
        {
            _options = options.Value;
            _db = db;
        }

        public string BuildAuthUrl(int userId)
        {
            var flow = BuildFlow();
            var request = (GoogleAuthorizationCodeRequestUrl)flow.CreateAuthorizationCodeRequest(_options.RedirectUri);
            request.State = userId.ToString(); // round-trips which TalentHub user this is for
            request.AccessType = "offline";
            request.Prompt = "consent";
            return request.Build().ToString();
        }

        public async Task<string> ConnectAsync(string code, int userId)
        {
            var flow = BuildFlow();
            TokenResponse token = await flow.ExchangeCodeForTokenAsync(
                userId: userId.ToString(),
                code: code,
                redirectUri: _options.RedirectUri,
                taskCancellationToken: default);

            if (string.IsNullOrEmpty(token.RefreshToken))
            {
                throw new InvalidOperationException(
                    "Google didn't return a refresh token. If you've connected this app before, " +
                    "remove it under myaccount.google.com/permissions and try connecting again.");
            }

            var service = BuildCalendarService(token.RefreshToken, userId);
            var googleUser = await service.CalendarList.Get("primary").ExecuteAsync();

            var existing = await _db.Set<GoogleCalendarConnection>()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (existing == null)
            {
                existing = new GoogleCalendarConnection { UserId = userId };
                _db.Add(existing);
            }

            existing.RefreshToken = token.RefreshToken;
            existing.GoogleAccountEmail = googleUser.Id; // "primary" calendar's Id is the account email
            existing.ConnectedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return existing.GoogleAccountEmail;
        }

        public async Task<bool> IsConnectedAsync(int userId)
        {
            return await _db.Set<GoogleCalendarConnection>().AnyAsync(c => c.UserId == userId);
        }

        public async Task<List<(DateTime Start, DateTime End)>> CheckAvailabilityAsync(int userId, DateTime startUtc, DateTime endUtc)
        {
            var connection = await _db.Set<GoogleCalendarConnection>()
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (connection == null)
            {
                // No connected calendar to check against - treat as no known conflicts.
                return new List<(DateTime, DateTime)>();
            }

            var service = BuildCalendarService(connection.RefreshToken, userId);

            var freeBusyRequest = new FreeBusyRequest
            {
                TimeMin = startUtc,
                TimeMax = endUtc,
                Items = new List<FreeBusyRequestItem> { new FreeBusyRequestItem { Id = "primary" } }
            };

            var response = await service.Freebusy.Query(freeBusyRequest).ExecuteAsync();
            var busy = response.Calendars.TryGetValue("primary", out var cal) ? cal.Busy : null;
            busy ??= new List<TimePeriod>();

            return busy
                .Where(b => b.Start.HasValue && b.End.HasValue)
                .Select(b => (b.Start!.Value, b.End!.Value))
                .ToList();
        }

        public async Task<(string EventId, string HtmlLink)?> CreateEventForInterviewAsync(Interview interview, Application application)
        {
            // Retry-safe: don't create a second event if one already exists for this interview.
            if (!string.IsNullOrEmpty(interview.CalendarEventId))
            {
                return (interview.CalendarEventId, BuildFallbackLink(interview.CalendarEventId));
            }

            var connection = await _db.Set<GoogleCalendarConnection>()
                .FirstOrDefaultAsync(c => c.UserId == interview.ScheduledByUserId);

            if (connection == null)
            {
                // Scheduling still succeeds in TalentHub even if the recruiter
                // hasn't connected Google Calendar - it's an optional add-on.
                return null;
            }

            var service = BuildCalendarService(connection.RefreshToken, interview.ScheduledByUserId);

            var candidateEmail = application.Candidate?.User?.Email;
            var attendees = new List<EventAttendee> { new EventAttendee { Email = connection.GoogleAccountEmail } };
            if (!string.IsNullOrWhiteSpace(candidateEmail))
            {
                attendees.Add(new EventAttendee { Email = candidateEmail });
            }
            AddAdditionalGuests(attendees, interview);

            var googleEvent = new Event
            {
                Summary = BuildSummary(interview, application),
                Description = BuildDescription(interview, application),
                Location = interview.InterviewType == InterviewType.InPerson ? interview.Location : null,
                Start = new EventDateTime { DateTimeDateTimeOffset = interview.ScheduledAt },
                End = new EventDateTime { DateTimeDateTimeOffset = interview.ScheduledAt.AddMinutes(interview.DurationMinutes) },
                Attendees = attendees,
                Reminders = new Event.RemindersData { UseDefault = true }
            };

            var created = await service.Events
                .Insert(googleEvent, "primary")
                .ExecuteAsync();

            return (created.Id, created.HtmlLink);
        }

        public async Task UpdateEventForInterviewAsync(Interview interview, Application application)
        {
            if (string.IsNullOrEmpty(interview.CalendarEventId)) return;

            var connection = await _db.Set<GoogleCalendarConnection>()
                .FirstOrDefaultAsync(c => c.UserId == interview.ScheduledByUserId);
            if (connection == null) return;

            var service = BuildCalendarService(connection.RefreshToken, interview.ScheduledByUserId);

            var existing = await service.Events.Get("primary", interview.CalendarEventId).ExecuteAsync();
            existing.Summary = BuildSummary(interview, application);
            existing.Start = new EventDateTime { DateTimeDateTimeOffset = interview.ScheduledAt };
            existing.End = new EventDateTime { DateTimeDateTimeOffset = interview.ScheduledAt.AddMinutes(interview.DurationMinutes) };
            existing.Location = interview.InterviewType == InterviewType.InPerson ? interview.Location : null;
            existing.Description = BuildDescription(interview, application);

            // Rebuild the attendee list from scratch (organizer + candidate + any
            // additional guests) rather than only appending, so a guest removed
            // by the organizer on reschedule is actually dropped from the invite.
            var candidateEmail = application.Candidate?.User?.Email;
            var attendees = new List<EventAttendee> { new EventAttendee { Email = connection.GoogleAccountEmail } };
            if (!string.IsNullOrWhiteSpace(candidateEmail))
            {
                attendees.Add(new EventAttendee { Email = candidateEmail });
            }
            AddAdditionalGuests(attendees, interview);
            existing.Attendees = attendees;

            await service.Events.Update(existing, "primary", interview.CalendarEventId).ExecuteAsync();
        }

        public async Task CancelEventForInterviewAsync(Interview interview)
        {
            if (string.IsNullOrEmpty(interview.CalendarEventId)) return;

            var connection = await _db.Set<GoogleCalendarConnection>()
                .FirstOrDefaultAsync(c => c.UserId == interview.ScheduledByUserId);
            if (connection == null) return;

            var service = BuildCalendarService(connection.RefreshToken, interview.ScheduledByUserId);

            try
            {
                await service.Events.Delete("primary", interview.CalendarEventId).ExecuteAsync();
            }
            catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound || ex.HttpStatusCode == System.Net.HttpStatusCode.Gone)
            {
                // Event may already be gone (deleted manually in Google Calendar) - not a failure.
            }
        }

        private static string BuildSummary(Interview interview, Application application)
        {
            var candidateName = application.Candidate?.User != null
                ? $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}"
                : "Candidate";
            var jobTitle = application.Vacancy?.Title ?? "Vacancy";
            return $"Interview: {candidateName} - {jobTitle} (Round {interview.RoundNumber}, {interview.InterviewCategory})";
        }

        private static string BuildDescription(Interview interview, Application application)
        {
            var candidateName = application.Candidate?.User != null
                ? $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}"
                : "Unknown candidate";
            var interviewerName = interview.ScheduledByUser != null
                ? $"{interview.ScheduledByUser.FirstName} {interview.ScheduledByUser.LastName}"
                : "TalentHub recruiter";

            var lines = new List<string>
            {
                $"Candidate: {candidateName}",
                $"Position: {application.Vacancy?.Title ?? "Unknown"}",
                $"Interview type: {interview.InterviewType}",
                $"Category: {interview.InterviewCategory}",
                $"Interviewer: {interviewerName}"
            };

            if (interview.InterviewType == InterviewType.Virtual && !string.IsNullOrWhiteSpace(interview.MeetingLink))
            {
                lines.Add($"Join: {interview.MeetingLink}");
            }
            if (!string.IsNullOrWhiteSpace(interview.RecruiterNotes))
            {
                lines.Add($"Notes: {interview.RecruiterNotes}");
            }

            lines.Add("Scheduled via TalentHub.");
            return string.Join("\n", lines);
        }

        // Adds any organizer-supplied extra guests (e.g. a hiring manager or a
        // co-interviewer) to the attendee list, skipping anyone already on it
        // (e.g. if a guest happens to match the candidate or organizer email).
        private static void AddAdditionalGuests(List<EventAttendee> attendees, Interview interview)
        {
            if (string.IsNullOrWhiteSpace(interview.AdditionalGuestEmails)) return;

            var existing = new HashSet<string>(
                attendees.Where(a => !string.IsNullOrWhiteSpace(a.Email)).Select(a => a.Email!),
                StringComparer.OrdinalIgnoreCase);

            foreach (var guestEmail in interview.AdditionalGuestEmails.Split(
                ';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (existing.Add(guestEmail))
                {
                    attendees.Add(new EventAttendee { Email = guestEmail });
                }
            }
        }

        private static string BuildFallbackLink(string eventId) =>
            $"https://calendar.google.com/calendar/event?eid={eventId}";

        private GoogleAuthorizationCodeFlow BuildFlow()
        {
            return new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = _options.ClientId,
                    ClientSecret = _options.ClientSecret
                },
                Scopes = _options.Scopes,
                DataStore = new NullDataStore() // we persist tokens ourselves in GoogleCalendarConnection
            });
        }

        private CalendarService BuildCalendarService(string refreshToken, int userId)
        {
            var credential = new UserCredential(
                BuildFlow(),
                userId.ToString(),
                new TokenResponse { RefreshToken = refreshToken });

            return new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "TalentHub"
            });
        }
    }
}
