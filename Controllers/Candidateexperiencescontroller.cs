using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/experience")]
    public class CandidateExperiencesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CandidateExperiencesController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/candidates/{candidateId}/experience
        [HttpGet]
        public async Task<ActionResult<List<ExperienceResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var results = await _db.CandidateExperiences
                .Where(e => e.CandidateId == candidateId)
                .OrderByDescending(e => e.StartDate)
                .Select(e => MapToResponse(e))
                .ToListAsync();

            return Ok(results);
        }

        // POST api/candidates/{candidateId}/experience
        [HttpPost]
        public async Task<ActionResult<ExperienceResponse>> Create(int candidateId, CreateExperienceRequest request)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (request.EndDate.HasValue && request.EndDate.Value < request.StartDate)
            {
                return BadRequest(new { message = "EndDate cannot be earlier than StartDate." });
            }

            var experience = new CandidateExperience
            {
                CandidateId = candidateId,
                Company = request.Company,
                Role = request.Role,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ProjectsAndDuties = request.ProjectsAndDuties,
                CreatedAt = DateTime.UtcNow
            };

            _db.CandidateExperiences.Add(experience);
            await _db.SaveChangesAsync();

            return Ok(MapToResponse(experience));
        }

        // DELETE api/candidates/{candidateId}/experience/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int candidateId, int id)
        {
            var experience = await _db.CandidateExperiences
                .FirstOrDefaultAsync(e => e.CandidateExperienceId == id && e.CandidateId == candidateId);

            if (experience == null)
            {
                return NotFound(new { message = $"No experience record found with id {id} for this candidate." });
            }

            _db.CandidateExperiences.Remove(experience);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        private static ExperienceResponse MapToResponse(CandidateExperience e)
        {
            return new ExperienceResponse
            {
                CandidateExperienceId = e.CandidateExperienceId,
                CandidateId = e.CandidateId,
                Company = e.Company,
                Role = e.Role,
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                ProjectsAndDuties = e.ProjectsAndDuties
            };
        }
    }
}