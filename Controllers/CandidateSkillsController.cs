using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/skills")]
    public class CandidateSkillsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CandidateSkillsController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/candidates/{candidateId}/skills
        [HttpGet]
        public async Task<ActionResult<List<CandidateSkillResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var skills = await _db.CandidateSkills
                .Include(cs => cs.Skill)
                .Where(cs => cs.CandidateId == candidateId)
                .Select(cs => new CandidateSkillResponse
                {
                    CandidateSkillId = cs.CandidateSkillId,
                    SkillId = cs.SkillId,
                    SkillName = cs.Skill!.Name,
                    Category = cs.Skill!.Category,
                    AddedAt = cs.AddedAt
                })
                .OrderBy(s => s.Category)
                .ThenBy(s => s.SkillName)
                .ToListAsync();

            return Ok(skills);
        }

        // POST api/candidates/{candidateId}/skills
        // Body: { "skillIds": [1, 4, 7] } - adds any of these not already assigned.
        // Skills already on the candidate's profile are silently skipped (no error),
        // so the frontend can resubmit a full selected-skills list without needing
        // to diff it against what's already saved.
        [HttpPost]
        public async Task<ActionResult<List<CandidateSkillResponse>>> AssignSkills(int candidateId, AssignSkillsRequest request)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var requestedIds = request.SkillIds.Distinct().ToList();

            var validSkillIds = await _db.Skills
                .Where(s => requestedIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToListAsync();

            var invalidIds = requestedIds.Except(validSkillIds).ToList();
            if (invalidIds.Count > 0)
            {
                return BadRequest(new { message = $"Unknown SkillId(s): {string.Join(", ", invalidIds)}." });
            }

            var alreadyAssignedIds = await _db.CandidateSkills
                .Where(cs => cs.CandidateId == candidateId && validSkillIds.Contains(cs.SkillId))
                .Select(cs => cs.SkillId)
                .ToListAsync();

            var toAdd = validSkillIds.Except(alreadyAssignedIds).ToList();

            foreach (var skillId in toAdd)
            {
                _db.CandidateSkills.Add(new CandidateSkill
                {
                    CandidateId = candidateId,
                    SkillId = skillId,
                    AddedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();

            return await GetAll(candidateId);
        }

        // DELETE api/candidates/{candidateId}/skills/{skillId}
        [HttpDelete("{skillId}")]
        public async Task<IActionResult> RemoveSkill(int candidateId, int skillId)
        {
            var link = await _db.CandidateSkills
                .FirstOrDefaultAsync(cs => cs.CandidateId == candidateId && cs.SkillId == skillId);

            if (link == null)
            {
                return NotFound(new { message = "This candidate does not have that skill assigned." });
            }

            _db.CandidateSkills.Remove(link);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}