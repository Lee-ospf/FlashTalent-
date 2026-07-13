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
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var requestedIds = request.Skills.Select(s => s.SkillId).Distinct().ToList();

            var validSkillIds = await _db.Skills
                .Where(s => requestedIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToListAsync();

            var invalidIds = requestedIds.Except(validSkillIds).ToList();
            if (invalidIds.Count > 0)
            {
                return BadRequest(new { message = $"Unknown SkillId(s): {string.Join(", ", invalidIds)}." });
            }

            var existingLinks = await _db.CandidateSkills
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
                    _db.CandidateSkills.Add(new CandidateSkill
                    {
                        CandidateId = candidateId,
                        SkillId = item.SkillId,
                        ProficiencyLevel = level,
                        AddedAt = DateTime.UtcNow
                    });
                }
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