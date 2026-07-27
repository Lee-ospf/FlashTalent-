using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;
using TalentHub.DTOs;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Recruiter,Admin")]
    public class RecruiterController : TalentHubControllerBase
    {
        public RecruiterController(AppDbContext db) : base(db)
        {
        }

        // GET: api/Recruiter
        // Internal staff directory - Recruiter/Admin only.
        [HttpGet]
        public async Task<IActionResult> GetAllRecruiters()
        {
            var recruiters = await Db.Recruiters
                .Include(r => r.User)
                .Select(r => new
                {
                    r.RecruiterId,
                    r.JobTitle,
                    FullName = r.User != null ? r.User.FirstName + " " + r.User.LastName : null,
                    Email = r.User != null ? r.User.Email : null
                })
                .ToListAsync();

            return Ok(recruiters);
        }

        // GET: api/Recruiter/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRecruiterById(int id)
        {
            var recruiter = await Db.Recruiters
                .Include(r => r.User)
                .Where(r => r.RecruiterId == id)
                .Select(r => new
                {
                    r.RecruiterId,
                    r.JobTitle,
                    FullName = r.User != null ? r.User.FirstName + " " + r.User.LastName : null,
                    Email = r.User != null ? r.User.Email : null
                })
                .FirstOrDefaultAsync();


            if (recruiter is null)
                return NotFound($"Recruiter with ID {id} not found.");

            return Ok(recruiter);
        }

        // POST: api/Recruiter
        // Admin only. NOTE: this assumes a User row already exists with Role=Recruiter/Admin -
        // it's a separate path from AuthController's /create-recruiter (which creates the User
        // AND the Recruiter profile together with a temp password). Worth consolidating these
        // two paths later so there's only one way to create a recruiter.
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateRecruiter([FromBody] CreateRecruiterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await Db.Users.FindAsync(dto.UserId);

            if (user is null)
                return BadRequest($"User with ID {dto.UserId} does not exist.");

            if (user.Role != UserRole.Recruiter && user.Role != UserRole.Admin)
                return BadRequest("This user's Role must be set to Recruiter or Admin before a recruiter profile can be created.");

            var alreadyExists = await Db.Recruiters.AnyAsync(r => r.UserId == dto.UserId);
            if (alreadyExists)
                return BadRequest($"User with ID {dto.UserId} already has a recruiter profile.");

            var recruiter = new Recruiter
            {
                UserId = dto.UserId,
                JobTitle = dto.JobTitle
            };

            Db.Recruiters.Add(recruiter);
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(recruiter, user));
        }

        private static RecruiterResponse MapToResponse(Recruiter r, User u)
        {
            return new RecruiterResponse
            {
                RecruiterId = r.RecruiterId,
                UserId = r.UserId,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                JobTitle = r.JobTitle
            };
        }

    }
}