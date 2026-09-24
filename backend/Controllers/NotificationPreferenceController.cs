using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;


 

namespace TalentHub.Controllers
    {
    [ApiController]
    [Route("api/notification-preferences")]
    [Authorize]
    public class NotificationPreferencesController : TalentHubControllerBase
    {
        public NotificationPreferencesController(AppDbContext db) : base(db) { }

        // GET api/notification-preferences
        [HttpGet]
        public async Task<ActionResult<List<NotificationPreferenceResponse>>> GetMine()
        {
            var prefs = await Db.UserNotificationPreferences
                .Where(p => p.UserId == CurrentUserId)
                .Select(p => new NotificationPreferenceResponse
                {
                    NotificationType = p.NotificationType,
                    Channel = p.Channel.ToString()
                })
                .ToListAsync();

            return Ok(prefs);
        }

        // PUT api/notification-preferences
        [HttpPut]
        public async Task<ActionResult> SetPreference(SetNotificationPreferenceRequest request)
        {
            if (!Enum.TryParse<NotificationChannel>(request.Channel, true, out var channel))
            {
                var valid = string.Join(", ", Enum.GetNames(typeof(NotificationChannel)));
                return BadRequest(new { message = $"Invalid channel '{request.Channel}'. Valid values: {valid}." });
            }

            var existing = await Db.UserNotificationPreferences
                .FirstOrDefaultAsync(p => p.UserId == CurrentUserId && p.NotificationType == request.NotificationType);

            if (existing != null)
                existing.Channel = channel;
            else
                Db.UserNotificationPreferences.Add(new UserNotificationPreference
                {
                    UserId = CurrentUserId,
                    NotificationType = request.NotificationType,
                    Channel = channel
                });

            await Db.SaveChangesAsync();
            return NoContent();
        }


        // DELETE api/notification-preferences/{notificationType}
        [HttpDelete("{notificationType}")]
        public async Task<ActionResult> DeletePreference(NotificationType notificationType)
        {
            var existing = await Db.UserNotificationPreferences
                .FirstOrDefaultAsync(p => p.UserId == CurrentUserId && p.NotificationType == notificationType);

            if (existing != null)
            {
                Db.UserNotificationPreferences.Remove(existing);
                await Db.SaveChangesAsync();
            }

            return NoContent();
        }
    }
    }
    


