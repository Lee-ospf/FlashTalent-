using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/qualifications")]
    [Authorize]
    public class CandidateQualificationsController : TalentHubControllerBase
    {
        public CandidateQualificationsController(AppDbContext db) : base(db)
        {
        }

        // GET api/candidates/{candidateId}/qualifications
        // Optional ?type=Education or ?type=Certification filter
        [HttpGet]
        public async Task<ActionResult<List<QualificationResponse>>> GetAll(int candidateId, [FromQuery] string? type)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var query = Db.CandidateQualifications.Where(q => q.CandidateId == candidateId);

            if (!string.IsNullOrWhiteSpace(type))
            {
                if (!Enum.TryParse<QualificationType>(type, true, out var parsedType))
                {
                    return BadRequest(new { message = $"Invalid type '{type}'. Valid values: Education, Certification." });
                }
                query = query.Where(q => q.QualificationType == parsedType);
            }

            var results = await query
                .OrderByDescending(q => q.YearCompleted)
                .Select(q => MapToResponse(q))
                .ToListAsync();

            return Ok(results);
        }

        // POST api/candidates/{candidateId}/qualifications
        [HttpPost]
        public async Task<ActionResult<QualificationResponse>> Create(int candidateId, CreateQualificationRequest request)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            if (!Enum.TryParse<QualificationType>(request.QualificationType, true, out var parsedType))
            {
                return BadRequest(new { message = $"Invalid qualificationType '{request.QualificationType}'. Valid values: Education, Certification." });
            }

            var qualification = new CandidateQualification
            {
                CandidateId = candidateId,
                QualificationType = parsedType,
                Name = request.Name,
                Institution = request.Institution,
                YearCompleted = request.YearCompleted,
                CreatedAt = DateTime.UtcNow
            };

            Db.CandidateQualifications.Add(qualification);
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(qualification));
        }

        // DELETE api/candidates/{candidateId}/qualifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int candidateId, int id)
        {
            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            var qualification = await Db.CandidateQualifications
                .FirstOrDefaultAsync(q => q.CandidateQualificationId == id && q.CandidateId == candidateId);

            if (qualification == null)
            {
                return NotFound(new { message = $"No qualification found with id {id} for this candidate." });
            }

            // DB-level cascade isn't possible here (would conflict with Candidate -> CandidateDocuments'
            // own cascade path), so any documents attached to this qualification are removed explicitly first.
            var attachedDocs = await Db.CandidateDocuments
                .Where(d => d.QualificationId == id)
                .ToListAsync();
            Db.CandidateDocuments.RemoveRange(attachedDocs);

            Db.CandidateQualifications.Remove(qualification);
            await Db.SaveChangesAsync();

            return NoContent();
        }

        private static QualificationResponse MapToResponse(CandidateQualification q)
        {
            return new QualificationResponse
            {
                CandidateQualificationId = q.CandidateQualificationId,
                CandidateId = q.CandidateId,
                QualificationType = q.QualificationType.ToString(),
                Name = q.Name,
                Institution = q.Institution,
                YearCompleted = q.YearCompleted
            };
        }
    }
}