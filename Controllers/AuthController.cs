using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;
using Microsoft.AspNetCore.Authorization;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ITokenService _tokenService;

        public AuthController(AppDbContext db, ITokenService tokenService)
        {
            _db = db;
            _tokenService = tokenService;
        }

        
        // POST api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
        {
            var emailExists = await _db.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
            {
                return Conflict(new { message = "An account with this email already exists." });
            }

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.Candidate,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            var candidate = new Candidate
            {
                UserId = user.UserId,
                RegisteredAt = DateTime.UtcNow,

            };

            _db.Candidates.Add(candidate);
            await _db.SaveChangesAsync();

            var (token, expiresAt) = _tokenService.GenerateToken(user);

            return Ok(new AuthResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role.ToString(),
                Token = token,
                ExpiresAt = expiresAt,
                MustChangePassword = user.MustChangePassword
            });
        }

        // POST api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new { message = "This account has been deactivated." });
            }

            var (token, expiresAt) = _tokenService.GenerateToken(user);

            return Ok(new AuthResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role.ToString(),
                Token = token,
                ExpiresAt = expiresAt,
                MustChangePassword = user.MustChangePassword
            });
        }
        [Authorize(Roles = "Admin")]
        [HttpPost("create-recruiter")]
        public async Task<IActionResult> CreateRecruiter(CreateUserRequest request)
        {
            var exists = await _db.Users.AnyAsync(x => x.Email == request.Email);

            if (exists)
                return Conflict(new { message = "Email already exists." });

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.Recruiter,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var recruiter = new Recruiter
            {
                UserId = user.UserId,
                JobTitle = request.JobTitle
            };

            _db.Recruiters.Add(recruiter);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Recruiter created successfully."
            });
        }
        [Authorize(Roles = "Admin")]
        [HttpPost("create-admin")]
        public async Task<IActionResult> CreateAdmin(CreateUserRequest request)
        {
            var exists = await _db.Users.AnyAsync(x => x.Email == request.Email);

            if (exists)
                return Conflict(new { message = "Email already exists." });

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.Admin,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Admin created successfully."
            });
        }
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

            var user = await _db.Users.FindAsync(userId);

            if (user == null)
                return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.MustChangePassword = false;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Password changed successfully."
            });
        }
    }
}
