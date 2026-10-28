using Hangfire;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;

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
        [DisableConcurrentExecution(timeoutInSeconds: 60)]
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
                        GetRecipient(notification), notification.Subject, notification.Body);

                    if (success)
                    {
                        notification.Status = DeliveryStatus.Sent;
                        notification.SentAt = DateTime.UtcNow;
                        RedactIfCredential(notification);
                    }
                    else if (notification.AttemptCount >= MaxAttempts)
                    {
                        notification.Status = DeliveryStatus.Failed;
                        notification.ErrorMessage = "Email send failed after maximum retry attempts.";
                        RedactIfCredential(notification);
                    }
                    // else: stays Pending and is retried next run
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

        // First-login emails go to the personal address when one exists (employees),
        // because their work-email login isn't something they can read yet.
        private static string GetRecipient(Notification n)
        {
            var user = n.User!;
            var isFirstLogin = n.NotificationType is NotificationType.TemporaryPassword
                                                  or NotificationType.WorkEmailAssigned;
            return isFirstLogin && !string.IsNullOrWhiteSpace(user.PersonalEmail)
                ? user.PersonalEmail
                : user.Email;
        }

        // Don't keep the plaintext temp password once the email has been handled.
        private static void RedactIfCredential(Notification n)
        {
            if (n.NotificationType == NotificationType.TemporaryPassword)
                n.Body = "A temporary password was emailed to this user. (Redacted after sending.)";
        }
    }
}