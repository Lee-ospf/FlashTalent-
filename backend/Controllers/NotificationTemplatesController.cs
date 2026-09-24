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
    [Route("api/notification-templates")]
    [Authorize(Roles = "Admin,Recruiter")]
    public class NotificationTemplatesController : TalentHubControllerBase
    {
        public NotificationTemplatesController(AppDbContext db) : base(db) { }

        // GET api/notification-templates
        [HttpGet]
        public async Task<ActionResult<List<NotificationTemplateResponse>>> GetAll()
        {
            var templates = await Db.NotificationTemplates
                .OrderBy(t => t.NotificationType).ThenBy(t => t.Channel)
                .Select(t => new NotificationTemplateResponse
                {
                    NotificationTemplateId = t.NotificationTemplateId,
                    NotificationType = t.NotificationType.ToString(),
                    Channel = t.Channel.ToString(),
                    Subject = t.Subject,
                    BodyTemplate = t.BodyTemplate
                })
                .ToListAsync();

            return Ok(templates);
        }

        // PUT api/notification-templates/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, UpdateNotificationTemplateRequest request)
        {
            var template = await Db.NotificationTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound(new { message = $"No template found with id {id}." });
            }

            if (string.IsNullOrWhiteSpace(request.BodyTemplate))
            {
                return BadRequest(new { message = "Body cannot be empty." });
            }

            template.Subject = request.Subject;
            template.BodyTemplate = request.BodyTemplate;
            await Db.SaveChangesAsync();

            return NoContent();
        }

        // POST api/notification-templates
        [HttpPost]
        public async Task<ActionResult<NotificationTemplateResponse>> Create(CreateNotificationTemplateRequest request)
        {
            if (!Enum.TryParse<NotificationType>(request.NotificationType, true, out var type))
            {
                var validTypes = string.Join(", ", Enum.GetNames(typeof(NotificationType)));
                return BadRequest(new { message = $"Invalid notificationType '{request.NotificationType}'. Valid values: {validTypes}." });
            }
            if (!Enum.TryParse<NotificationChannel>(request.Channel, true, out var channel))
            {
                var validChannels = string.Join(", ", Enum.GetNames(typeof(NotificationChannel)));
                return BadRequest(new { message = $"Invalid channel '{request.Channel}'. Valid values: {validChannels}." });
            }
            if (string.IsNullOrWhiteSpace(request.BodyTemplate))
            {
                return BadRequest(new { message = "Body cannot be empty." });
            }

            var exists = await Db.NotificationTemplates
                .AnyAsync(t => t.NotificationType == type && t.Channel == channel);
            if (exists)
            {
                return Conflict(new { message = $"A template for {type}/{channel} already exists." });
            }

            var template = new NotificationTemplate
            {
                NotificationType = type,
                Channel = channel,
                Subject = request.Subject,
                BodyTemplate = request.BodyTemplate,
                IsActive = true
            };

            Db.NotificationTemplates.Add(template);
            await Db.SaveChangesAsync();

            return Ok(new NotificationTemplateResponse
            {
                NotificationTemplateId = template.NotificationTemplateId,
                NotificationType = type.ToString(),
                Channel = channel.ToString(),
                Subject = template.Subject,
                BodyTemplate = template.BodyTemplate
            });
        }

        // GET api/notification-templates/available-combinations
        // The type/channel pairs that don't have a row yet - feeds the "Add template" form's dropdown.
        [HttpGet("available-combinations")]
        public async Task<ActionResult<List<AvailableCombinationResponse>>> GetAvailableCombinations()
        {
            var existing = await Db.NotificationTemplates
                .Select(t => new { t.NotificationType, t.Channel })
                .ToListAsync();

            var existingSet = existing.Select(e => (e.NotificationType, e.Channel)).ToHashSet();

            var missing = new List<AvailableCombinationResponse>();
            foreach (NotificationType type in Enum.GetValues<NotificationType>())
            {
                foreach (NotificationChannel channel in Enum.GetValues<NotificationChannel>())
                {
                    if (channel == NotificationChannel.None) continue; // not a real template channel
                    if (!existingSet.Contains((type, channel)))
                    {
                        missing.Add(new AvailableCombinationResponse
                        {
                            NotificationType = type.ToString(),
                            Channel = channel.ToString()
                        });
                    }
                }
            }

            return Ok(missing);
        }

        // GET api/notification-templates/placeholders
        [HttpGet("placeholders")]
        public ActionResult<Dictionary<string, string[]>> GetPlaceholders()
        {
            var result = NotificationPlaceholders.ByType
                .ToDictionary(kvp => kvp.Key.ToString(), kvp => kvp.Value);
            return Ok(result);
        }
    }
}