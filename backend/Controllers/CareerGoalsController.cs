using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Employee side: create, edit, achieve, archive and restore their own goals, and get advice.
    // HR side: read goals the employee shares, and the advice for them.
    // Nothing is deleted: an old goal is Achieved or Archived, so history stays.
    [ApiController]
    [Route("api")]
    [Authorize]
    public class CareerGoalsController : TalentHubControllerBase
    {
        private readonly ISkillSuggestionService _suggestions;

        public CareerGoalsController(AppDbContext db, ISkillSuggestionService suggestions) : base(db)
        {
            _suggestions = suggestions;
        }

        // ================= Employee: my goals =================

        // GET api/career-goals/mine?status=Active
        // Without a status: Active and Achieved. Archived goals only when asked for.
        [HttpGet("career-goals/mine")]
        [Authorize(Roles = "Employee")]
        public async Task<ActionResult<List<CareerGoalResponse>>> GetMine([FromQuery] CareerGoalStatus? status)
        {
            var myId = await MyEmployeeIdAsync();
            if (myId == null) return NotFound(new { message = "No active employee profile was found for you." });

            var query = Db.CareerGoals.AsNoTracking().Where(g => g.EmployeeId == myId.Value);
            query = status.HasValue
                ? query.Where(g => g.Status == status.Value)
                : query.Where(g => g.Status != CareerGoalStatus.Archived);

            var goals = await query
                .OrderBy(g => g.Status)                 // Active first
                .ThenByDescending(g => g.CreatedAt)
                .ToListAsync();

            return Ok(await ToResponsesAsync(goals));
        }

        // POST api/career-goals
        [HttpPost("career-goals")]
        [Authorize(Roles = "Employee")]
        public async Task<ActionResult<CareerGoalResponse>> Create(CreateCareerGoalRequest request)
        {
            var myId = await MyEmployeeIdAsync();
            if (myId == null) return NotFound(new { message = "No active employee profile was found for you." });

            var (role, date, error) = ValidateInput(request);
            if (error != null) return BadRequest(new { message = error });

            var limitError = await CheckCanBeActiveAsync(myId.Value, role!, exceptGoalId: null);
            if (limitError != null) return BadRequest(new { message = limitError });

            var goal = new CareerGoal
            {
                EmployeeId = myId.Value,
                TargetRole = role!,
                TargetDate = date,
                ShareWithHr = request.ShareWithHr,
                Status = CareerGoalStatus.Active
            };

            Db.CareerGoals.Add(goal);
            await Db.SaveChangesAsync();

            return Ok((await ToResponsesAsync(new List<CareerGoal> { goal })).First());
        }

        // PUT api/career-goals/{id}   (active goals only)
        [HttpPut("career-goals/{id:int}")]
        [Authorize(Roles = "Employee")]
        public async Task<ActionResult<CareerGoalResponse>> Update(int id, UpdateCareerGoalRequest request)
        {
            var goal = await LoadMineAsync(id);
            if (goal == null) return NotFound(new { message = $"No career goal found with CareerGoalId {id}." });

            if (goal.Status != CareerGoalStatus.Active)
                return BadRequest(new { message = "Only an active goal can be edited." });

            var (role, date, error) = ValidateInput(request);
            if (error != null) return BadRequest(new { message = error });

            var limitError = await CheckCanBeActiveAsync(goal.EmployeeId, role!, exceptGoalId: goal.CareerGoalId);
            if (limitError != null) return BadRequest(new { message = limitError });

            goal.TargetRole = role!;
            goal.TargetDate = date;
            goal.ShareWithHr = request.ShareWithHr;
            goal.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok((await ToResponsesAsync(new List<CareerGoal> { goal })).First());
        }

        // POST api/career-goals/{id}/achieve   Active -> Achieved
        [HttpPost("career-goals/{id:int}/achieve")]
        [Authorize(Roles = "Employee")]
        public Task<ActionResult<CareerGoalResponse>> Achieve(int id)
            => ChangeStatusAsync(id, CareerGoalStatus.Achieved);

        // POST api/career-goals/{id}/archive   Active or Achieved -> Archived
        [HttpPost("career-goals/{id:int}/archive")]
        [Authorize(Roles = "Employee")]
        public Task<ActionResult<CareerGoalResponse>> Archive(int id)
            => ChangeStatusAsync(id, CareerGoalStatus.Archived);

        // POST api/career-goals/{id}/restore   Archived -> Active (still limited to 3 active goals)
        [HttpPost("career-goals/{id:int}/restore")]
        [Authorize(Roles = "Employee")]
        public Task<ActionResult<CareerGoalResponse>> Restore(int id)
            => ChangeStatusAsync(id, CareerGoalStatus.Active);

        private async Task<ActionResult<CareerGoalResponse>> ChangeStatusAsync(int id, CareerGoalStatus target)
        {
            var goal = await LoadMineAsync(id);
            if (goal == null) return NotFound(new { message = $"No career goal found with CareerGoalId {id}." });

            var allowed = target switch
            {
                CareerGoalStatus.Achieved => goal.Status == CareerGoalStatus.Active,
                CareerGoalStatus.Archived => goal.Status != CareerGoalStatus.Archived,
                CareerGoalStatus.Active => goal.Status == CareerGoalStatus.Archived,
                _ => false
            };

            if (!allowed)
                return BadRequest(new { message = $"A goal that is {goal.Status} can't be changed to {target}." });

            if (target == CareerGoalStatus.Active)
            {
                var limitError = await CheckCanBeActiveAsync(goal.EmployeeId, goal.TargetRole, exceptGoalId: goal.CareerGoalId);
                if (limitError != null) return BadRequest(new { message = limitError });
            }

            goal.Status = target;
            goal.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok((await ToResponsesAsync(new List<CareerGoal> { goal })).First());
        }

        // ================= Employee: advice for my goal =================

        // GET api/career-goals/{id}/advice   (204 = nothing generated yet)
        // Works for Achieved and Archived goals too, as history.
        [HttpGet("career-goals/{id:int}/advice")]
        [Authorize(Roles = "Employee")]
        public async Task<ActionResult<SkillSuggestionResponse>> GetAdvice(int id, CancellationToken ct)
        {
            var goal = await LoadMineAsync(id);
            if (goal == null) return NotFound(new { message = $"No career goal found with CareerGoalId {id}." });

            try
            {
                var result = await _suggestions.GetForGoalAsync(id, ct);
                return result == null ? NoContent() : Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST api/career-goals/{id}/advice   (generate or refresh; uses one of 5 generations per 24 hours)
        [HttpPost("career-goals/{id:int}/advice")]
        [Authorize(Roles = "Employee")]
        public async Task<ActionResult<SkillSuggestionResponse>> GenerateAdvice(int id, CancellationToken ct)
        {
            var goal = await LoadMineAsync(id);
            if (goal == null) return NotFound(new { message = $"No career goal found with CareerGoalId {id}." });

            try { return Ok(await _suggestions.GenerateForGoalAsync(id, CurrentUserId, ct)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (SuggestionLimitException ex) { return StatusCode(429, new { message = ex.Message }); }   // before the 400 catch
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (AiProviderException ex) { return StatusCode(502, new { message = ex.Message }); }
        }

        // ================= HR: goals employees chose to share =================

        // GET api/employees/{employeeId}/career-goals
        // Only goals the employee shares, and never archived ones.
        [HttpGet("employees/{employeeId:int}/career-goals")]
        [Authorize(Roles = "HR,Admin")]
        public async Task<ActionResult<List<CareerGoalResponse>>> GetSharedForEmployee(int employeeId)
        {
            if (!await Db.Employees.AnyAsync(e => e.EmployeeId == employeeId))
                return NotFound(new { message = $"No employee found with EmployeeId {employeeId}." });

            var goals = await Db.CareerGoals.AsNoTracking()
                .Where(g => g.EmployeeId == employeeId
                         && g.ShareWithHr
                         && g.Status != CareerGoalStatus.Archived)
                .OrderBy(g => g.Status)
                .ThenByDescending(g => g.CreatedAt)
                .ToListAsync();

            return Ok(await ToResponsesAsync(goals));
        }

        // GET api/hr/career-goals/{id}/advice   (204 = nothing generated yet)
        [HttpGet("hr/career-goals/{id:int}/advice")]
        [Authorize(Roles = "HR,Admin")]
        public async Task<ActionResult<SkillSuggestionResponse>> GetSharedAdvice(int id, CancellationToken ct)
        {
            // A goal that isn't shared looks exactly like one that doesn't exist
            var visible = await Db.CareerGoals.AsNoTracking().AnyAsync(g =>
                g.CareerGoalId == id && g.ShareWithHr && g.Status != CareerGoalStatus.Archived);
            if (!visible) return NotFound(new { message = $"No shared career goal found with CareerGoalId {id}." });

            try
            {
                var result = await _suggestions.GetForGoalAsync(id, ct);
                return result == null ? NoContent() : Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ================= Helpers =================

        private Task<int?> MyEmployeeIdAsync()
            => Db.Employees.AsNoTracking()
                .Where(e => e.UserId == CurrentUserId && e.Status == "Active")
                .Select(e => (int?)e.EmployeeId)
                .FirstOrDefaultAsync();

        // The goal, only if it belongs to the logged-in employee
        private async Task<CareerGoal?> LoadMineAsync(int goalId)
        {
            var myId = await MyEmployeeIdAsync();
            if (myId == null) return null;
            return await Db.CareerGoals.FirstOrDefaultAsync(g => g.CareerGoalId == goalId && g.EmployeeId == myId.Value);
        }

        // Cleans and checks the text and date. Returns the cleaned values or an error message.
        private static (string? Role, DateTime? Date, string? Error) ValidateInput(CreateCareerGoalRequest request)
        {
            // Trim and collapse repeated spaces, so "Tech   Lead " is saved as "Tech Lead"
            var role = string.Join(' ', (request.TargetRole ?? string.Empty)
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

            if (role.Length == 0)
                return (null, null, "TargetRole is required.");

            if (role.Length > SkillSuggestionRules.MaxGoalTextLength)
                return (null, null, $"TargetRole can't be longer than {SkillSuggestionRules.MaxGoalTextLength} characters.");

            DateTime? date = null;
            if (request.TargetDate.HasValue)
            {
                date = request.TargetDate.Value.Date;
                if (date < BusinessClock.Today)
                    return (null, null, "TargetDate can't be in the past.");
            }

            return (role, date, null);
        }

        // For a goal that is (or is becoming) Active: room under the limit, and not a duplicate
        private async Task<string?> CheckCanBeActiveAsync(int employeeId, string role, int? exceptGoalId)
        {
            var others = await Db.CareerGoals.AsNoTracking()
                .Where(g => g.EmployeeId == employeeId
                         && g.Status == CareerGoalStatus.Active
                         && g.CareerGoalId != exceptGoalId)
                .Select(g => g.TargetRole)
                .ToListAsync();

            if (others.Count >= SkillSuggestionRules.MaxActiveGoals)
                return $"You can have at most {SkillSuggestionRules.MaxActiveGoals} active goals. Archive or complete one first.";

            if (others.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase)))
                return "You already have an active goal with that role.";

            return null;
        }

        private async Task<List<CareerGoalResponse>> ToResponsesAsync(List<CareerGoal> goals)
        {
            var ids = goals.Select(g => g.CareerGoalId).ToList();

            var advice = await Db.SkillAdvices.AsNoTracking()
                .Where(a => a.CareerGoalId.HasValue && ids.Contains(a.CareerGoalId.Value))
                .Select(a => new { GoalId = a.CareerGoalId!.Value, a.GeneratedAt })
                .ToListAsync();
            var adviceByGoal = advice.ToDictionary(a => a.GoalId, a => a.GeneratedAt);

            return goals.Select(g => new CareerGoalResponse
            {
                CareerGoalId = g.CareerGoalId,
                EmployeeId = g.EmployeeId,
                TargetRole = g.TargetRole,
                TargetDate = g.TargetDate,
                Status = g.Status,
                ShareWithHr = g.ShareWithHr,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                HasAdvice = adviceByGoal.ContainsKey(g.CareerGoalId),
                AdviceGeneratedAt = adviceByGoal.TryGetValue(g.CareerGoalId, out var at) ? at : null
            }).ToList();
        }
    }
}