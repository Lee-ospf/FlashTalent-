using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using Microsoft.EntityFrameworkCore;

public interface INotificationService
{
    Task<List<Notification>> Build(NotificationRequest request);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db) => _db = db;

    public async Task<List<Notification>> Build(NotificationRequest request)
    {
        var channel = request.Channel ?? await ResolveChannelAsync(request.UserId, request.Type);

        var channelsToSend = channel == NotificationChannel.Both
            ? new[] { NotificationChannel.Email, NotificationChannel.InApp }
            : new[] { channel };

        var results = new List<Notification>();
        foreach (var ch in channelsToSend)
        {
            results.Add(await BuildForChannel(request, ch));
        }
        return results;
    }

    private async Task<Notification> BuildForChannel(NotificationRequest request, NotificationChannel channel)
    {
        if (channel == NotificationChannel.None)
        {
            return new Notification
            {
                UserId = request.UserId,
                NotificationType = request.Type,
                Channel = channel,
                Priority = request.Priority,
                Subject = string.Empty,
                Body = string.Empty,
                Status = DeliveryStatus.Skipped
            };
        }

        var template = await _db.NotificationTemplates
            .FirstOrDefaultAsync(t => t.NotificationType == request.Type && t.Channel == channel && t.IsActive);

        if (template == null)
        {
            return new Notification
            {
                UserId = request.UserId,
                NotificationType = request.Type,
                Channel = channel,
                Priority = request.Priority,
                Subject = "Notification error",
                Body = string.Empty,
                Status = DeliveryStatus.Failed,
                ErrorMessage = $"No active template for {request.Type} on {channel}."
            };
        }

        return new Notification
        {
            UserId = request.UserId,
            NotificationType = request.Type,
            Channel = channel,
            Priority = request.Priority,
            Subject = Render(template.Subject ?? string.Empty, request.TemplateData),
            Body = Render(template.BodyTemplate, request.TemplateData),
            ScheduledAt = request.ScheduledAt,
            Status = DeliveryStatus.Pending
        };
    }

    private async Task<NotificationChannel> ResolveChannelAsync(int userId, NotificationType type)
    {
        var specific = await _db.UserNotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.NotificationType == type);
        if (specific != null) return specific.Channel;

        var global = await _db.UserNotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.NotificationType == null);
        if (global != null) return global.Channel;

        return NotificationChannel.Both; 
    }

    private static string Render(string template, Dictionary<string, string> data)
    {
        var result = template;
        foreach (var kvp in data)
            result = result.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
        return result;
    }
}