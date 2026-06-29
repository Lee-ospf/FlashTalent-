using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CandidatesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CandidatesController(AppDbContext db)
        {
            _db = db;
        }

        // POST api/candidates
        // Creates a Candidate profile linked to an existing User.
        [HttpPost]
        public async Task<ActionResult<CandidateResponse>> Create(CreateCandidateRequest request)
        {
            var user = await _db.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new { message = $"No user found with UserId {request.UserId}." });
            }

            var alreadyHasCandidate = await _db.Candidates.AnyAsync(c => c.UserId == request.UserId);
            if (alreadyHasCandidate)
            {
                return Conflict(new { message = "This user already has a candidate profile." });
            }

            var candidate = new Candidate
            {
                UserId = request.UserId,
                Phone = request.Phone,
                Gender = request.Gender,
                Race = request.Race,
                Nationality = request.Nationality,
  
                DateOfBirth = request.DateOfBirth,
                
                RegisteredAt = DateTime.UtcNow
            };

            _db.Candidates.Add(candidate);
            await _db.SaveChangesAsync();

            return Ok(MapToResponse(candidate, user, new List<string>()));
        }

        // GET api/candidates/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<CandidateResponse>> GetById(int id)
        {
            var candidate = await _db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.CandidateId == id);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {id}." });
            }

            var docTypes = candidate.Documents.Select(d => d.DocumentType.ToString()).ToList();
            return Ok(MapToResponse(candidate, candidate.User, docTypes));
        }

        // GET api/candidates
        [HttpGet]
        public async Task<ActionResult<List<CandidateResponse>>> GetAll()
        {
            var candidates = await _db.Candidates
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
        [HttpPut("{id}")]
        public async Task<ActionResult<CandidateResponse>> Update(int id, UpdateCandidateRequest request)
        {
            var candidate = await _db.Candidates
                .Include(c => c.User)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.CandidateId == id);

            if (candidate == null || candidate.User == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {id}." });
            }

            candidate.Phone = request.Phone;
            candidate.Gender = request.Gender;
            candidate.Race = request.Race;
            candidate.Nationality = request.Nationality;
           
            candidate.DateOfBirth = request.DateOfBirth;
            

            await _db.SaveChangesAsync();

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
             
                DateOfBirth = c.DateOfBirth,
               
                RegisteredAt = c.RegisteredAt,
                UploadedDocumentTypes = documentTypes
            };
        }
    }
}