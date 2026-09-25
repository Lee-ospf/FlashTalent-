using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TalentHub.Data;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/auth/google")]
    public class GoogleAuthController : TalentHubControllerBase
    {
        private readonly IGoogleCalendarService _calendarService;

        public GoogleAuthController(AppDbContext db, IGoogleCalendarService calendarService) : base(db)
        {
            _calendarService = calendarService;
        }

        // GET api/auth/google/connect
        // Called by the Angular app (with the recruiter's JWT attached) to get the
        // Google consent URL. Angular then does window.location.href = authUrl.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("connect")]
        public IActionResult Connect()
        {
            var authUrl = _calendarService.BuildAuthUrl(CurrentUserId);
            return Ok(new { authUrl });
        }

        // GET api/auth/google/callback
        // Google redirects the browser here directly - no JWT is present, so this
        // must stay anonymous. The user's identity travels via the "state" param.
        [AllowAnonymous]
        [HttpGet("callback")]
        public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state)
        {
            if (!int.TryParse(state, out var userId))
            {
                return BadRequest(new { message = "Invalid or missing state parameter." });
            }

            try
            {
                var connectedEmail = await _calendarService.ConnectAsync(code, userId);
                // Redirect back into your Angular app's settings page with a success flag.
                return Redirect($"http://localhost:4200/settings/calendar?connected=true&email={connectedEmail}");
            }
            catch (InvalidOperationException ex)
            {
                return Redirect($"http://localhost:4200/settings/calendar?connected=false&error={Uri.EscapeDataString(ex.Message)}");
            }
        }

        // GET api/auth/google/status
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("status")]
        public async Task<IActionResult> Status()
        {
            var connected = await _calendarService.IsConnectedAsync(CurrentUserId);
            return Ok(new { connected });
        }
    }
}
