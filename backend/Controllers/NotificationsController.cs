using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : TalentHubControllerBase
    {
        public NotificationsController(AppDbContext db) : base(db) { }

        // GET api/notifications
        // Always scoped to the logged-in user - notifications are personal, not shared.
        [HttpGet]
        public async Task<ActionResult<List<NotificationResponse>>> GetAll()
        {
            var notifications = await Db.Notifications
                .Where(n => n.UserId == CurrentUserId)
                .OrderByDescending(n => n.SentAt)
                .Select(n => new NotificationResponse
                {
                    NotificationId = n.NotificationId,
                    NotificationType = n.NotificationType.ToString(),
                    Subject = n.Subject,
                    Body = n.Body,
                    IsRead = n.IsRead,
                    SentAt = n.SentAt
                })
                .ToListAsync();

            return Ok(notifications);
        }

        // GET api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<ActionResult<UnreadCountResponse>> GetUnreadCount()
        {
            var count = await Db.Notifications
                .CountAsync(n => n.UserId == CurrentUserId && !n.IsRead);

            return Ok(new UnreadCountResponse { UnreadCount = count });
        }

        // PUT api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var notification = await Db.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == id);

            if (notification == null)
            {
                return NotFound(new { message = $"No notification found with id {id}." });
            }

            if (notification.UserId != CurrentUserId)
            {
                return Forbid(); // can't mark someone else's notification as read
            }

            notification.IsRead = true;
            await Db.SaveChangesAsync();

            return NoContent();
        }

        // PUT api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var unread = await Db.Notifications
                .Where(n => n.UserId == CurrentUserId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
            }

            await Db.SaveChangesAsync();

            return NoContent();
        }
    }
}