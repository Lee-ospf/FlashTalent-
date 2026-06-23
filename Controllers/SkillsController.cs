using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SkillsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SkillsController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/skills
        // Optional ?category=Technical query filter
        [HttpGet]
        public async Task<ActionResult<List<SkillResponse>>> GetAll([FromQuery] string? category)
        {
            var query = _db.Skills.AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(s => s.Category == category);
            }

            var skills = await query
                .OrderBy(s => s.Category)
                .ThenBy(s => s.Name)
                .Select(s => new SkillResponse
                {
                    SkillId = s.SkillId,
                    Name = s.Name,
                    Category = s.Category
                })
                .ToListAsync();

            return Ok(skills);
        }

        // GET api/skills/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SkillResponse>> GetById(int id)
        {
            var skill = await _db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category });
        }

        // POST api/skills
        [HttpPost]
        public async Task<ActionResult<SkillResponse>> Create(CreateSkillRequest request)
        {
            var nameExists = await _db.Skills.AnyAsync(s => s.Name == request.Name);
            if (nameExists)
            {
                return Conflict(new { message = $"A skill named '{request.Name}' already exists." });
            }

            var skill = new Skill
            {
                Name = request.Name,
                Category = request.Category,
                CreatedAt = DateTime.UtcNow
            };

            _db.Skills.Add(skill);
            await _db.SaveChangesAsync();

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category });
        }

        // PUT api/skills/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<SkillResponse>> Update(int id, UpdateSkillRequest request)
        {
            var skill = await _db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            var nameTakenByAnother = await _db.Skills.AnyAsync(s => s.Name == request.Name && s.SkillId != id);
            if (nameTakenByAnother)
            {
                return Conflict(new { message = $"A different skill named '{request.Name}' already exists." });
            }

            skill.Name = request.Name;
            skill.Category = request.Category;
            await _db.SaveChangesAsync();

            return Ok(new SkillResponse { SkillId = skill.SkillId, Name = skill.Name, Category = skill.Category });
        }

        // DELETE api/skills/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var skill = await _db.Skills.FindAsync(id);
            if (skill == null)
            {
                return NotFound(new { message = $"No skill found with SkillId {id}." });
            }

            var inUse = await _db.CandidateSkills.AnyAsync(cs => cs.SkillId == id);
            if (inUse)
            {
                return Conflict(new { message = "This skill is assigned to one or more candidates and cannot be deleted. Remove it from those candidates first." });
            }

            _db.Skills.Remove(skill);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}