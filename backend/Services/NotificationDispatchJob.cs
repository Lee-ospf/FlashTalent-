using TalentHub.Data;
using TalentHub.Models;
using Microsoft.EntityFrameworkCore;

namespace TalentHub.Services
{
    public class NotificationDispatchJob
    {
        private readonly AppDbContext _db;
        private readonly INotificationEmailSender _emailSender;
        private const int MaxAttempts = 3;

        public NotificationDispatchJob(AppDbContext db, INotificationEmailSender emailSender)
        {
            _db = db;
            _emailSender = emailSender;
        }

        public async Task RunAsync()
        {
            var pending = await _db.Notifications
                .Include(n => n.User)
                .Where(n => n.Status == DeliveryStatus.Pending && n.AttemptCount < MaxAttempts)
                .ToListAsync();

            foreach (var notification in pending)
            {
                notification.AttemptCount++;

                if (notification.Channel == NotificationChannel.Email)
                {
                    var success = await _emailSender.SendAsync(
                        notification.User!.Email, notification.Subject, notification.Body);

                    if (success)
                    {
                        notification.Status = DeliveryStatus.Sent;
                        notification.SentAt = DateTime.UtcNow;
                    }
                    else if (notification.AttemptCount >= MaxAttempts)
                    {
                        notification.Status = DeliveryStatus.Failed;
                        notification.ErrorMessage = "Email send failed after maximum retry attempts.";
                    }
                    // else: stays Pending, picked up again next run — this IS the retry (FR-04)
                }
                else // InApp
                {
                    // No external send step — it already exists as a row the candidate/recruiter
                    // can read via GET /api/notifications. "Delivered" just means marking it Sent.
                    notification.Status = DeliveryStatus.Sent;
                    notification.SentAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
        }
    }
}