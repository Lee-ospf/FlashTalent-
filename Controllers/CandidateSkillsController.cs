using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/skills")]
    [Authorize]
    public class CandidateSkillsController : TalentHubControllerBase
    {
        public CandidateSkillsController(AppDbContext db) : base(db)
        {
        }

        // GET api/candidates/{candidateId}/skills
        [HttpGet]
        public async Task<ActionResult<List<CandidateSkillResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var skills = await Db.CandidateSkills
                .Include(cs => cs.Skill)
                .Where(cs => cs.CandidateId == candidateId)
                .Select(cs => new CandidateSkillResponse
                {
                    CandidateSkillId = cs.CandidateSkillId,
                    SkillId = cs.SkillId,
                    SkillName = cs.Skill!.Name,
                    Category = cs.Skill!.Category.ToString(),
                    ProficiencyLevel = cs.ProficiencyLevel.ToString(),
                    AddedAt = cs.AddedAt
                })
                .OrderBy(s => s.Category)
                .ThenBy(s => s.SkillName)
                .ToListAsync();

            return Ok(skills);
        }

        // POST api/candidates/{candidateId}/skills
        // Body: { "skills": [{ "skillId": 1, "proficiencyLevel": "Intermediate" }, ...] }
        // If a skill is already assigned, its proficiency level is updated rather than duplicated.
        [HttpPost]
        public async Task<ActionResult<List<CandidateSkillResponse>>> AssignSkills(int candidateId, AssignSkillsRequest request)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            var requestedIds = request.Skills.Select(s => s.SkillId).Distinct().ToList();

            var validSkillIds = await Db.Skills
                .Where(s => requestedIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToListAsync();

            var invalidIds = requestedIds.Except(validSkillIds).ToList();
            if (invalidIds.Count > 0)
            {
                return BadRequest(new { message = $"Unknown SkillId(s): {string.Join(", ", invalidIds)}." });
            }

            var existingLinks = await Db.CandidateSkills
                .Where(cs => cs.CandidateId == candidateId && validSkillIds.Contains(cs.SkillId))
                .ToListAsync();

            foreach (var item in request.Skills)
            {
                if (!Enum.TryParse<ProficiencyLevel>(item.ProficiencyLevel, true, out var level))
                {
                    var validLevels = string.Join(", ", Enum.GetNames(typeof(ProficiencyLevel)));
                    return BadRequest(new { message = $"Invalid proficiency level '{item.ProficiencyLevel}'. Valid values: {validLevels}." });
                }

                var existing = existingLinks.FirstOrDefault(e => e.SkillId == item.SkillId);
                if (existing != null)
                {
                    existing.ProficiencyLevel = level; // update level if it changed
                }
                else
                {
                    Db.CandidateSkills.Add(new CandidateSkill
                    {
                        CandidateId = candidateId,
                        SkillId = item.SkillId,
                        ProficiencyLevel = level,
                        AddedAt = DateTime.UtcNow
                    });
                }
            }

            await Db.SaveChangesAsync();

            return await GetAll(candidateId);
        }

        // DELETE api/candidates/{candidateId}/skills/{skillId}
        [HttpDelete("{skillId}")]
        public async Task<IActionResult> RemoveSkill(int candidateId, int skillId)
        {
            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            var link = await Db.CandidateSkills
                .FirstOrDefaultAsync(cs => cs.CandidateId == candidateId && cs.SkillId == skillId);

            if (link == null)
            {
                return NotFound(new { message = "This candidate does not have that skill assigned." });
            }

            Db.CandidateSkills.Remove(link);
            await Db.SaveChangesAsync();

            return NoContent();
        }
    }
}