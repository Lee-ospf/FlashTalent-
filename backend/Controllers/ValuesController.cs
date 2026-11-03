using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Training recommendations for a project gap (HR side), and accepting or dismissing a step.
    // Career-goal advice endpoints live in CareerGoalsController (Step 5).
    [ApiController]
    [Route("api")]
    [Authorize]
    public class SkillSuggestionsController : TalentHubControllerBase
    {
        private readonly ISkillSuggestionService _suggestions;

        public SkillSuggestionsController(AppDbContext db, ISkillSuggestionService suggestions) : base(db)
        {
            _suggestions = suggestions;
        }

        // GET api/projects/{projectId}/employees/{employeeId}/gaps   (code only, no AI)
        [HttpGet("projects/{projectId:int}/employees/{employeeId:int}/gaps")]
        [Authorize(Roles = "HR,Admin")]
        public async Task<ActionResult<ProjectGapResponse>> GetGap(int projectId, int employeeId, CancellationToken ct)
        {
            try { return Ok(await _suggestions.GetProjectGapAsync(projectId, employeeId, ct)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET api/projects/{projectId}/employees/{employeeId}/suggestions
        // 204 = nothing generated yet
        [HttpGet("projects/{projectId:int}/employees/{employeeId:int}/suggestions")]
        [Authorize(Roles = "HR,Admin")]
        public async Task<ActionResult<SkillSuggestionResponse>> Get(int projectId, int employeeId, CancellationToken ct)
        {
            try
            {
                var result = await _suggestions.GetForProjectAsync(projectId, employeeId, ct);
                return result == null ? NoContent() : Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST api/projects/{projectId}/employees/{employeeId}/suggestions
        [HttpPost("projects/{projectId:int}/employees/{employeeId:int}/suggestions")]
        [Authorize(Roles = "HR,Admin")]
        public async Task<ActionResult<SkillSuggestionResponse>> Generate(int projectId, int employeeId, CancellationToken ct)
        {
            try { return Ok(await _suggestions.GenerateForProjectAsync(projectId, employeeId, CurrentUserId, ct)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (SuggestionLimitException ex) { return StatusCode(429, new { message = ex.Message }); }   // before the 400 catch
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (AiProviderException ex) { return StatusCode(502, new { message = ex.Message }); }
        }

        // PATCH api/skill-advice-items/{id}/status
        // Project advice: HR or Admin. Career-goal advice: only the employee it belongs to.
        [HttpPatch("skill-advice-items/{id:int}/status")]
        [Authorize(Roles = "HR,Admin,Employee")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateSuggestionItemStatusRequest request)
        {
            if (!Enum.IsDefined(request.Status))
                return BadRequest(new { message = "Status is not valid." });

            var item = await Db.SkillAdviceItems
                .Include(i => i.Advice)
                .FirstOrDefaultAsync(i => i.SkillAdviceItemId == id);

            if (item == null)
                return NotFound(new { message = $"No advice step found with id {id}." });

            var isManagement = User.IsInRole("HR") || User.IsInRole("Admin");

            if (item.Advice!.Source == SuggestionSource.Project)
            {
                if (!isManagement) return Forbid();
            }
            else
            {
                var myEmployeeId = await Db.Employees.AsNoTracking()
                    .Where(e => e.UserId == CurrentUserId)
                    .Select(e => (int?)e.EmployeeId)
                    .FirstOrDefaultAsync();

                if (myEmployeeId != item.Advice.EmployeeId) return Forbid();
            }

            if (item.Status != request.Status)
            {
                item.Status = request.Status;
                item.StatusChangedAt = DateTime.UtcNow;
                await Db.SaveChangesAsync();
            }

            return NoContent();
        }
    }
}