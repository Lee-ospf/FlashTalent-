
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public class ReminderScanJob
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notificationService;

        public ReminderScanJob(AppDbContext db, INotificationService notificationService)
        {
            _db = db;
            _notificationService = notificationService;
        }

        public async Task RunAsync()
        {
            var now = DateTime.UtcNow;

            await ScanPrescreenings(now);
            await ScanInterviews(now);
            await ScanOffers(now);

            await _db.SaveChangesAsync();
        }

        private async Task ScanPrescreenings(DateTime now)
        {
            var threshold = now.AddDays(-3);

            var due = await _db.Prescreenings
                .Include(p => p.Application).ThenInclude(a => a!.Candidate)
                .Include(p => p.Application).ThenInclude(a => a!.Vacancy)
                .Where(p => p.Status == PrescreeningStatus.Sent
                         && p.SentAt <= threshold
                         && p.ReminderSentAt == null)
                .ToListAsync();

            foreach (var p in due)
            {
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = p.Application!.Candidate!.UserId,
                    Type = NotificationType.PrescreeningReminder,
                    TemplateData = new() { ["VacancyTitle"] = p.Application.Vacancy!.Title }
                });
                _db.Notifications.AddRange(notifications);
                p.ReminderSentAt = now;
            }
        }

        private async Task ScanInterviews(DateTime now)
        {
            var window = now.AddHours(24);

            var due = await _db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.Candidate)
                .Include(i => i.Application).ThenInclude(a => a!.Vacancy)
                .Where(i => i.Status == InterviewStatus.Scheduled
                         && i.ScheduledAt <= window
                         && i.ScheduledAt > now
                         && i.ReminderSentAt == null)
                .ToListAsync();

            foreach (var i in due)
            {
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = i.Application!.Candidate!.UserId,
                    Type = NotificationType.InterviewReminder,
                    TemplateData = new()
                    {
                        ["VacancyTitle"] = i.Application.Vacancy!.Title,
                        ["ScheduledAt"] = i.ScheduledAt.ToString("f")
                    }
                });
                _db.Notifications.AddRange(notifications);
                i.ReminderSentAt = now;
            }
        }

        private async Task ScanOffers(DateTime now)
        {
            var window = now.AddDays(2);

            var due = await _db.OfferLetters
                .Include(o => o.Application).ThenInclude(a => a!.Candidate)
                .Where(o => o.Status == OfferLetterStatus.Sent
                         && o.ClosingDate <= window
                         && o.ClosingDate > now
                         && o.ReminderSentAt == null)
                .ToListAsync();

            foreach (var o in due)
            {
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = o.Application!.Candidate!.UserId,
                    Type = NotificationType.OfferResponseReminder,
                    TemplateData = new()
                    {
                        ["JobTitle"] = o.JobTitle,
                        ["ClosingDate"] = o.ClosingDate.ToString("d")
                    }
                });
                _db.Notifications.AddRange(notifications);
                o.ReminderSentAt = now;
            }
        }
    }
}