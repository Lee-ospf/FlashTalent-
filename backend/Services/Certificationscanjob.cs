using System.Globalization;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    // Runs daily, just after ReminderScanJob. Kept separate so a problem here never blocks the
    // prescreening, interview and offer reminders. It does three independent things:
    //   1. Certification expiry alerts to employees (90 / 30 / 7 days before, and on the expiry date)
    //   2. One reminder per training assignment, 3 days before its due date
    //   3. A daily digest to active HR users, only when something newly needs their attention
    // Each part saves on its own, so one failing part can't stop the others. Safe to run twice:
    // the reminder log, ReminderSentAt and the digest check stop duplicates.
    public class CertificationScanJob
    {
        private const int TrainingReminderDaysBefore = 3;
        private const int AwaitingConfirmationDays = 3;

        private readonly AppDbContext _db;
        private readonly INotificationService _notificationService;
        private readonly ILogger<CertificationScanJob> _logger;

        public CertificationScanJob(
            AppDbContext db, INotificationService notificationService, ILogger<CertificationScanJob> logger)
        {
            _db = db;
            _notificationService = notificationService;
            _logger = logger;
        }

        // What the certification part did in this run, for the HR digest
        private class ScanSummary
        {
            public int ExpiringSent { get; set; }
            public int ExpiredSent { get; set; }
        }

        // Safe to retry: nothing is sent twice. Two attempts so a persistent fault doesn't keep retrying for hours.
        [AutomaticRetry(Attempts = 2)]
        public async Task RunAsync()
        {
            var today = BusinessClock.Today;
            var summary = new ScanSummary();
            var errors = new List<Exception>();

            var certsOk = await RunPartAsync("certification alerts", () => ScanCertificationsAsync(today, summary), errors);
            await RunPartAsync("training due reminders", () => ScanTrainingRemindersAsync(today), errors);

            // If the certification part failed, its counts are unknown. Skip the digest so HR
            // doesn't get an incomplete one that also blocks the complete one on the retry.
            if (certsOk)
                await RunPartAsync("HR digest", () => SendHrDigestAsync(today, summary), errors);

            // Let Hangfire show the run as failed if any part failed, after every part has had its turn
            if (errors.Count > 0)
                throw new AggregateException("One or more parts of the certification scan failed.", errors);
        }

        private async Task<bool> RunPartAsync(string name, Func<Task> part, List<Exception> errors)
        {
            try
            {
                await part();
                return true;
            }
            catch (Exception ex)
            {
                // Drop anything this part left unsaved, so it can't break the next part's save
                _db.ChangeTracker.Clear();
                _logger.LogError(ex, "CertificationScanJob part '{Part}' failed.", name);
                errors.Add(ex);
                return false;
            }
        }

        // ================= 1. Certification alerts =================

        private async Task ScanCertificationsAsync(DateTime today, ScanSummary summary)
        {
            // Only certificates that expire within 90 days, or expired within the alert window.
            // Anything that expired longer ago is on the HR list but is never touched here.
            var from = today.AddDays(-CertificationReminderRules.ExpiredAlertWindowDays);
            var to = today.AddDays(91); // exclusive, so day 90 is included whatever the stored time

            var certs = await _db.EmployeeQualifications
                .AsNoTracking()
                .Where(q => q.QualificationType == QualificationType.Certification
                    && q.ExpiryDate != null
                    && q.ExpiryDate >= from
                    && q.ExpiryDate < to
                    && q.Employee!.Status == "Active"
                    && q.Employee.User!.IsActive)
                .Select(q => new
                {
                    QualificationId = q.EmployeeQualificationId,
                    q.Name,
                    ExpiryDate = q.ExpiryDate!.Value,
                    UserId = q.Employee!.UserId,
                    FirstName = q.Employee.User!.FirstName,
                    LastName = q.Employee.User.LastName
                })
                .ToListAsync();

            if (certs.Count == 0)
                return;

            var certIds = certs.Select(c => c.QualificationId).ToList();
            var userIds = certs.Select(c => c.UserId).Distinct().ToList();

            // Reminder points already logged, per certification AND expiry date.
            // A changed expiry date has no rows yet, which is how renewals restart the cycle.
            var loggedRows = await _db.CertificationReminderLogs
                .AsNoTracking()
                .Where(l => certIds.Contains(l.EmployeeQualificationId))
                .Select(l => new { l.EmployeeQualificationId, l.ExpiryDate, l.ReminderPoint })
                .ToListAsync();

            var logged = loggedRows
                .GroupBy(l => (l.EmployeeQualificationId, Date: l.ExpiryDate.Date))
                .ToDictionary(g => g.Key, g => g.Select(x => x.ReminderPoint).ToList());

            // All preferences in one query, not one per employee
            var prefs = (await _db.UserNotificationPreferences
                    .AsNoTracking()
                    .Where(p => userIds.Contains(p.UserId))
                    .ToListAsync())
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var expiringSent = 0;
            var expiredSent = 0;

            foreach (var cert in certs)
            {
                var key = (cert.QualificationId, cert.ExpiryDate.Date);
                var alreadyLogged = logged.TryGetValue(key, out var points)
                    ? points
                    : new List<CertificationReminderPoint>();

                var decision = CertificationReminderRules.Evaluate(cert.ExpiryDate, today, alreadyLogged);
                if (!decision.HasWork)
                    continue;

                if (decision.ToSend is CertificationReminderPoint point)
                {
                    var isExpired = point == CertificationReminderPoint.Expired;
                    var type = isExpired
                        ? NotificationType.CertificationExpired
                        : NotificationType.CertificationExpiring;

                    var data = new Dictionary<string, string>
                    {
                        ["EmployeeName"] = cert.FirstName + " " + cert.LastName,
                        ["CertificationName"] = cert.Name,
                        ["ExpiryDate"] = FormatDate(cert.ExpiryDate)
                    };
                    if (!isExpired)
                        data["DaysLeft"] = CertificationReminderRules.DaysLeft(cert.ExpiryDate, today)
                            .ToString(CultureInfo.InvariantCulture);

                    var notifications = await _notificationService.Build(new NotificationRequest
                    {
                        UserId = cert.UserId,
                        Type = type,
                        Priority = NotificationPriority.High,
                        // The job decides the channel itself, so "None" can be overridden
                        Channel = EffectiveChannel(prefs, cert.UserId, type),
                        TemplateData = data
                    });
                    _db.Notifications.AddRange(notifications);

                    _db.CertificationReminderLogs.Add(new CertificationReminderLog
                    {
                        EmployeeQualificationId = cert.QualificationId,
                        ExpiryDate = cert.ExpiryDate.Date,
                        ReminderPoint = point,
                        WasSent = true
                    });

                    if (isExpired) expiredSent++; else expiringSent++;
                }

                foreach (var covered in decision.Covered)
                {
                    _db.CertificationReminderLogs.Add(new CertificationReminderLog
                    {
                        EmployeeQualificationId = cert.QualificationId,
                        ExpiryDate = cert.ExpiryDate.Date,
                        ReminderPoint = covered,
                        WasSent = false
                    });
                }
            }

            await _db.SaveChangesAsync();

            // Only counted once saved, so the digest never reports alerts that were rolled back
            summary.ExpiringSent = expiringSent;
            summary.ExpiredSent = expiredSent;
        }

        // The employee's own choice is respected, except that "None" (or no preference at all)
        // becomes Both: an expiry alert must never be silenced.
        // Order: preference for this type, then the user's global default, then Both.
        private static NotificationChannel EffectiveChannel(
            Dictionary<int, List<UserNotificationPreference>> prefs, int userId, NotificationType type)
        {
            if (prefs.TryGetValue(userId, out var list))
            {
                var chosen = list.FirstOrDefault(p => p.NotificationType == type)
                    ?? list.FirstOrDefault(p => p.NotificationType == null);

                if (chosen != null && chosen.Channel != NotificationChannel.None)
                    return chosen.Channel;
            }

            return NotificationChannel.Both;
        }

        // ================= 2. Training due reminders =================

        private async Task ScanTrainingRemindersAsync(DateTime today)
        {
            // Range instead of <= so the last day is included whatever time part DueDate carries
            var endExclusive = today.AddDays(TrainingReminderDaysBefore + 1);

            // One reminder per assignment. An assignment created with fewer days left still gets
            // its single reminder on the next run. A later due date resets ReminderSentAt (Step 4).
            var due = await _db.TrainingAssignments
                .Include(a => a.Employee)
                .Include(a => a.Intake).ThenInclude(i => i!.Programme)
                .Where(a => (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress)
                    && a.ReminderSentAt == null
                    && a.DueDate >= today
                    && a.DueDate < endExclusive
                    && a.Employee!.Status == "Active"
                    && a.Employee.User!.IsActive)
                .ToListAsync();

            if (due.Count == 0)
                return;

            var now = DateTime.UtcNow;

            foreach (var assignment in due)
            {
                // Respects the employee's preference ("None" gives a Skipped row)
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = assignment.Employee!.UserId,
                    Type = NotificationType.TrainingDueReminder,
                    TemplateData = new()
                    {
                        ["ProgrammeTitle"] = assignment.Intake!.Programme!.Title,
                        ["DueDate"] = FormatDate(assignment.DueDate)
                    }
                });
                _db.Notifications.AddRange(notifications);

                assignment.ReminderSentAt = now;
            }

            await _db.SaveChangesAsync();
        }

        // ================= 3. HR digest =================

        // One message per active HR user (not Admin), only when something is NEW in this run:
        //   - certificates that newly crossed a reminder point or expired
        //   - training that became overdue yesterday
        //   - submissions that passed 3 days of waiting in the last 24 hours
        // The full lists are always on the HR screens, so the digest doesn't repeat itself daily.
        private async Task SendHrDigestAsync(DateTime today, ScanSummary summary)
        {
            var now = DateTime.UtcNow;
            var yesterday = today.AddDays(-1);

            var newlyOverdue = await _db.TrainingAssignments.CountAsync(a =>
                (a.Status == TrainingAssignmentStatus.NotStarted || a.Status == TrainingAssignmentStatus.InProgress)
                && a.DueDate >= yesterday
                && a.DueDate < today);

            var waitingFrom = now.AddDays(-(AwaitingConfirmationDays + 1));
            var waitingTo = now.AddDays(-AwaitingConfirmationDays);

            var newlyWaiting = await _db.TrainingAssignments.CountAsync(a =>
                a.Status == TrainingAssignmentStatus.AwaitingConfirmation
                && a.SubmittedAt != null
                && a.SubmittedAt <= waitingTo
                && a.SubmittedAt > waitingFrom);

            var total = summary.ExpiringSent + summary.ExpiredSent + newlyOverdue + newlyWaiting;
            if (total == 0)
                return;

            var hrUserIds = await _db.Users
                .Where(u => u.Role == UserRole.HR && u.IsActive)
                .Select(u => u.UserId)
                .ToListAsync();

            if (hrUserIds.Count == 0)
                return;

            // Running the job again on the same day must not send a second digest
            var startOfDay = now.Date;
            var alreadyGot = (await _db.Notifications
                    .Where(n => n.NotificationType == NotificationType.HrComplianceDigest
                        && n.CreatedAt >= startOfDay
                        && hrUserIds.Contains(n.UserId))
                    .Select(n => n.UserId)
                    .Distinct()
                    .ToListAsync())
                .ToHashSet();

            foreach (var hrUserId in hrUserIds.Where(id => !alreadyGot.Contains(id)))
            {
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = hrUserId,
                    Type = NotificationType.HrComplianceDigest,
                    TemplateData = new()
                    {
                        ["ExpiringCount"] = summary.ExpiringSent.ToString(CultureInfo.InvariantCulture),
                        ["ExpiredCount"] = summary.ExpiredSent.ToString(CultureInfo.InvariantCulture),
                        ["OverdueTrainingCount"] = newlyOverdue.ToString(CultureInfo.InvariantCulture),
                        ["AwaitingConfirmationCount"] = newlyWaiting.ToString(CultureInfo.InvariantCulture)
                    }
                });
                _db.Notifications.AddRange(notifications);
            }

            await _db.SaveChangesAsync();
        }

        private static string FormatDate(DateTime date)
            => date.ToString("d MMM yyyy", CultureInfo.InvariantCulture);
    }
}