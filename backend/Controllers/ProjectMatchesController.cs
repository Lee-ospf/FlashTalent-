using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/matches")]
    [Authorize(Roles = "HR,Admin")]
    public class ProjectMatchesController : TalentHubControllerBase
    {
        private readonly IProjectMatchingService _matching;

        public ProjectMatchesController(AppDbContext db, IProjectMatchingService matching) : base(db)
        {
            _matching = matching;
        }

        // POST api/projects/{projectId}/matches/run
        [HttpPost("run")]
        public async Task<ActionResult<ProjectMatchRunResponse>> Run(int projectId, CancellationToken ct)
        {
            try
            {
                return Ok(await _matching.RunAsync(projectId, ct));
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (AiProviderException ex) { return StatusCode(502, new { message = ex.Message }); }
        }

        // GET api/projects/{projectId}/matches?includeDismissed=false
        [HttpGet]
        public async Task<ActionResult<ProjectMatchRunResponse>> Get(
            int projectId, [FromQuery] bool includeDismissed = false, CancellationToken ct = default)
        {
            var result = await _matching.GetAsync(projectId, includeDismissed, ct);
            if (result == null)
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });
            return Ok(result);
        }

        // POST api/projects/{projectId}/matches/{employeeId}/dismiss
        [HttpPost("{employeeId:int}/dismiss")]
        public async Task<IActionResult> Dismiss(int projectId, int employeeId)
        {
            var match = await Db.ProjectMatches
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.EmployeeId == employeeId);
            if (match == null)
                return NotFound(new { message = "No match result found. Run the match first." });

            var isMember = await Db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.EmployeeId == employeeId);
            if (isMember)
                return BadRequest(new { message = "This employee is already on the project, so they can't be dismissed." });

            match.IsDismissed = true;
            match.DismissedByUserId = CurrentUserId;
            match.DismissedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();
            return NoContent();
        }

        // POST api/projects/{projectId}/matches/{employeeId}/restore
        [HttpPost("{employeeId:int}/restore")]
        public async Task<IActionResult> Restore(int projectId, int employeeId)
        {
            var match = await Db.ProjectMatches
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.EmployeeId == employeeId);
            if (match == null)
                return NotFound(new { message = "No match result found." });

            match.IsDismissed = false;
            match.DismissedByUserId = null;
            match.DismissedAt = null;
            await Db.SaveChangesAsync();
            return NoContent();
        }
    }
}