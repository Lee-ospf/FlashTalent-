using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/experience")]
    [Authorize]
    public class CandidateExperiencesController : TalentHubControllerBase
    {
        public CandidateExperiencesController(AppDbContext db) : base(db)
        {
        }

        // GET api/candidates/{candidateId}/experience
        [HttpGet]
        public async Task<ActionResult<List<ExperienceResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var results = await Db.CandidateExperiences
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
            var candidate = await Db.Candidates.FindAsync(candidateId);
            if (candidate == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

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

            Db.CandidateExperiences.Add(experience);

            // Adding an experience entry is a profile-affecting change for
            // talent-pool matching recency purposes - see Candidate.LastProfileUpdateAt.
            candidate.LastProfileUpdateAt = DateTime.UtcNow;

            await Db.SaveChangesAsync();

            return Ok(MapToResponse(experience));
        }

        // DELETE api/candidates/{candidateId}/experience/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int candidateId, int id)
        {
            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            var experience = await Db.CandidateExperiences
                .FirstOrDefaultAsync(e => e.CandidateExperienceId == id && e.CandidateId == candidateId);

            if (experience == null)
            {
                return NotFound(new { message = $"No experience record found with id {id} for this candidate." });
            }

            Db.CandidateExperiences.Remove(experience);

            // Best-effort touch, doesn't block removal if the candidate row
            // is somehow already gone.
            var candidate = await Db.Candidates.FindAsync(candidateId);
            if (candidate != null)
            {
                candidate.LastProfileUpdateAt = DateTime.UtcNow;
            }

            await Db.SaveChangesAsync();

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