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
    public class CandidatesController : TalentHubControllerBase
    {
        public CandidatesController(AppDbContext db) : base(db)
        {
        }

        // POST api/candidates
        // Creates a Candidate profile linked to the LOGGED-IN user (never trusts a UserId from the body).
        [Authorize(Roles = "Candidate")]
        [HttpPost]
        public async Task<ActionResult<CandidateResponse>> Create(CreateCandidateRequest request)
        {
            var userId = CurrentUserId;

            var user = await Db.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = $"No user found with UserId {userId}." });
            }

            var alreadyHasCandidate = await Db.Candidates.AnyAsync(c => c.UserId == userId);
            if (alreadyHasCandidate)
            {
                return Conflict(new { message = "This user already has a candidate profile." });
            }
            if (request.DateOfBirth > DateTime.UtcNow)
            {
                return BadRequest(new { message = "Date of Birth cannot be in the future." });
            }

            var age = DateTime.UtcNow.Year - request.DateOfBirth.Year;
            if (request.DateOfBirth.Date > DateTime.UtcNow.AddYears(-age).Date) age--;

            if (age < 18)
            {
                return BadRequest(new { message = "Candidates must be at least 18 years old to register." });
            }
            var candidate = new Candidate
            {
                UserId = userId,
                Phone = request.Phone,
                Gender = request.Gender,
                Race = request.Race,
                Nationality = request.Nationality,

                DateOfBirth = request.DateOfBirth,

                RegisteredAt = DateTime.UtcNow
            };

            Db.Candidates.Add(candidate);
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(candidate, user, new List<string>()));
        }

        // GET api/candidates/me
        // Resolves the logged-in Candidate's own profile from their token - no CandidateId needed.
        [Authorize(Roles = "Candidate")]
        [HttpGet("me")]
        public async Task<ActionResult<CandidateResponse>> GetMyProfile()
        {
            var candidate = await Db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.UserId == CurrentUserId);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = "No candidate profile exists for this account yet." });
            }

            var docTypes = candidate.Documents.Select(d => d.DocumentType.ToString()).ToList();
            return Ok(MapToResponse(candidate, candidate.User, docTypes));
        }

        // GET api/candidates/{id}
        // Candidate can view their own profile; Recruiter/Admin can view any candidate's profile.
        [HttpGet("{id}")]
        public async Task<ActionResult<CandidateResponse>> GetById(int id)
        {
            var candidate = await Db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.CandidateId == id);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {id}." });
            }

            if (!await IsOwnerOrPrivileged(id)) return Forbid();

            var docTypes = candidate.Documents.Select(d => d.DocumentType.ToString()).ToList();
            return Ok(MapToResponse(candidate, candidate.User, docTypes));
        }

        // GET api/candidates
        // Full candidate list - talent pool browsing. Recruiter/Admin only.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet]
        public async Task<ActionResult<List<CandidateResponse>>> GetAll()
        {
            var candidates = await Db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .ToListAsync();

            var result = candidates
                .Where(c => c.User != null)
                .Select(c => MapToResponse(c, c.User!, c.Documents.Select(d => d.DocumentType.ToString()).ToList()))
                .ToList();

            return Ok(result);
        }

        // PUT api/candidates/{id}
        // Only the candidate themselves or an Admin can edit - Recruiters can view but not edit.
        [HttpPut("{id}")]
        public async Task<ActionResult<CandidateResponse>> Update(int id, UpdateCandidateRequest request)
        {
            var candidate = await Db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.CandidateId == id);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {id}." });
            }

            if (!await IsOwnerOrAdmin(id)) return Forbid();

            if (request.DateOfBirth > DateTime.UtcNow)
            {
                return BadRequest(new { message = "Date of Birth cannot be in the future." });
            }

            var age = DateTime.UtcNow.Year - request.DateOfBirth.Year;
            if (request.DateOfBirth.Date > DateTime.UtcNow.AddYears(-age).Date) age--;

            if (age < 18)
            {
                return BadRequest(new { message = "Candidates must be at least 18 years old to register." });
            }


            candidate.Phone = request.Phone;
            candidate.Gender = request.Gender;
            candidate.Race = request.Race;
            candidate.Nationality = request.Nationality;

            candidate.DateOfBirth = request.DateOfBirth;


            await Db.SaveChangesAsync();

            var docTypes = candidate.Documents.Select(d => d.DocumentType.ToString()).ToList();
            return Ok(MapToResponse(candidate, candidate.User, docTypes));
        }

        private static CandidateResponse MapToResponse(Candidate c, User u, List<string> documentTypes)
        {
            return new CandidateResponse
            {
                CandidateId = c.CandidateId,
                UserId = c.UserId,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Phone = c.Phone,
                Gender = c.Gender,
                Race = c.Race,
                Nationality = c.Nationality,

                DateOfBirth = (DateTime)c.DateOfBirth,

                RegisteredAt = c.RegisteredAt,
                UploadedDocumentTypes = documentTypes
            };
        }
    }
}