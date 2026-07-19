using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SkillsController : TalentHubControllerBase
    {
        public SkillsController(AppDbContext db) : base(db)
        {
        }

        // GET api/skills
        // Any authenticated role can browse the master skill list (candidates selecting skills,
        // recruiters building a vacancy).
        [HttpGet]
        public async Task<ActionResult<List<SkillResponse>>> GetAll([FromQuery] string? category)
        {
            var query = Db.Skills.AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                if (!Enum.TryParse<SkillCategory>(category, true, out var parsedCategory))
                {
                    return BadRequest(new { message = $"Invalid category '{category}'. Valid values: Technical, SoftSkill." });
                }
                query = query.Where(s => s.Category == parsedCategory);
            }
            var skills = await query
                .OrderBy(s => s.Category)
                .ThenBy(s => s.Name)
                .Select(s => new SkillResponse
                {
                    SkillId = s.SkillId,
                    Name = s.Name,
                    Category = s.Category.ToString()
                })
                .ToListAsync();

            return Ok(skills);
        }

        // GET api/skills/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SkillResponse>> GetById(int id)
        {
            var skill = await Db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category.ToString() });
        }

        // POST api/skills
        // Admin only - master skill list management.
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<SkillResponse>> Create(CreateSkillRequest request)
        {
            var nameExists = await Db.Skills.AnyAsync(s => s.Name == request.Name);
            if (nameExists)
            {
                return Conflict(new { message = $"A skill named '{request.Name}' already exists." });
            }

            if (!Enum.TryParse<SkillCategory>(request.Category, true, out var parsedCategory))
            {
                return BadRequest(new { message = $"Invalid category '{request.Category}'. Valid values: Technical, SoftSkill." });
            }

            var skill = new Skill
            {
                Name = request.Name,
                Category = parsedCategory,
                CreatedAt = DateTime.UtcNow
            };

            Db.Skills.Add(skill);
            await Db.SaveChangesAsync();

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category.ToString() });
        }

        // PUT api/skills/{id}
        // Admin only.
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<ActionResult<SkillResponse>> Update(int id, UpdateSkillRequest request)
        {
            var skill = await Db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            var nameTakenByAnother = await Db.Skills.AnyAsync(s => s.Name == request.Name && s.SkillId != id);
            if (nameTakenByAnother)
            {
                return Conflict(new { message = $"A different skill named '{request.Name}' already exists." });
            }

            if (!Enum.TryParse<SkillCategory>(request.Category, true, out var parsedCategory))
            {
                return BadRequest(new { message = $"Invalid category '{request.Category}'. Valid values: Technical, SoftSkill." });
            }

            skill.Name = request.Name;
            skill.Category = parsedCategory;
            await Db.SaveChangesAsync();

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category.ToString() });
        }

        // DELETE api/skills/{id}
        // Admin only.
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var skill = await Db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            var inUse = await Db.CandidateSkills.AnyAsync(cs => cs.SkillId == id);
            if (inUse)
            {
                return Conflict(new { message = "This skill is assigned to one or more candidates and cannot be deleted. Remove it from those candidates first." });
            }

            Db.Skills.Remove(skill);
            await Db.SaveChangesAsync();

            return NoContent();
        }
    }
}