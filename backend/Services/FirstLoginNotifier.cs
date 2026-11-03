using Hangfire;
using System.Security.Cryptography;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public static class TempPassword
    {
        private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        private const string Lower = "abcdefghijkmnpqrstuvwxyz";
        private const string Digits = "23456789";
        private const string Symbols = "!@#$%";

        public static string Generate(int length = 12)
        {
            var all = Upper + Lower + Digits + Symbols;
            var chars = new List<char> { Pick(Upper), Pick(Lower), Pick(Digits), Pick(Symbols) };
            while (chars.Count < length) chars.Add(Pick(all));

            // Fisher-Yates shuffle, so the guaranteed characters aren't always first
            for (int i = chars.Count - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars.ToArray());
        }

        private static char Pick(string set) => set[RandomNumberGenerator.GetInt32(set.Length)];
    }

    public interface IFirstLoginNotifier
    {
        Task SendTemporaryPasswordAsync(User user, string temporaryPassword);
        Task SendWorkEmailAsync(User user);
    }

    // Call these AFTER the user has been saved, so user.UserId exists.
    public class FirstLoginNotifier : IFirstLoginNotifier
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notifications;

        public FirstLoginNotifier(AppDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        public Task SendTemporaryPasswordAsync(User user, string temporaryPassword) =>
            QueueAsync(user, NotificationType.TemporaryPassword, new Dictionary<string, string>
            {
                ["FirstName"] = user.FirstName,
                ["LoginEmail"] = user.Email,
                ["TemporaryPassword"] = temporaryPassword
            });

        public Task SendWorkEmailAsync(User user) =>
            QueueAsync(user, NotificationType.WorkEmailAssigned, new Dictionary<string, string>
            {
                ["FirstName"] = user.FirstName,
                ["WorkEmail"] = user.Email
            });

        private async Task QueueAsync(User user, NotificationType type, Dictionary<string, string> data)
        {
            // The channel is forced to Email inside NotificationService.
            var notifications = await _notifications.Build(new NotificationRequest
            {
                UserId = user.UserId,
                Type = type,
                Priority = NotificationPriority.High,
                TemplateData = data
            });

            _db.Notifications.AddRange(notifications);
            await _db.SaveChangesAsync();
            BackgroundJob.Enqueue<NotificationDispatchJob>(job => job.RunAsync());
        }
    }
}