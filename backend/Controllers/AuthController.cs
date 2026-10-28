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

        private readonly IFirstLoginNotifier _firstLogin;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext db, ITokenService tokenService,
            IFirstLoginNotifier firstLogin, ILogger<AuthController> logger)
        {
            _db = db;
            _tokenService = tokenService;
            _firstLogin = firstLogin;
            _logger = logger;
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

            var tempPassword = TempPassword.Generate();

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
                Role = UserRole.Recruiter,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var recruiter = new Recruiter { UserId = user.UserId, JobTitle = request.JobTitle };
            _db.Recruiters.Add(recruiter);
            await _db.SaveChangesAsync();

            await TryQueueTempPasswordAsync(user, tempPassword);

            return Ok(new CreateUserResponse
            {
                Message = "Recruiter created successfully.",
                TemporaryPassword = tempPassword
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("create-hr")]
        public async Task<IActionResult> CreateHr(CreateUserRequest request)
        {
            var exists = await _db.Users.AnyAsync(x => x.Email == request.Email);

            if (exists)
                return Conflict(new { message = "Email already exists." });
            var tempPassword = TempPassword.Generate();

            var user = new User
            {
                
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
                Role = UserRole.HR,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow,
                HrProfile = new HrProfile { JobTitle = request.JobTitle ?? string.Empty }
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await TryQueueTempPasswordAsync(user, tempPassword);

            return Ok(new CreateUserResponse
            {
                Message = "HR user created successfully.",
                TemporaryPassword = tempPassword
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

        [Authorize(Roles = "Admin")]
        [HttpPost("resend-login/{userId:int}")]
        public async Task<ActionResult<CreateUserResponse>> ResendLogin(int userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (user.Role != UserRole.Recruiter && user.Role != UserRole.HR)
                return BadRequest(new { message = "Login details can only be resent for recruiter and HR accounts." });

            if (!user.IsActive)
                return BadRequest(new { message = "This account has been deactivated." });

            var tempPassword = TempPassword.Generate();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
            user.MustChangePassword = true;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await TryQueueTempPasswordAsync(user, tempPassword);

            return Ok(new CreateUserResponse
            {
                Message = "New login details issued.",
                TemporaryPassword = tempPassword
            });
        }

        // The account already exists and the admin gets the password in the response,
        // so a failure to queue the email must not fail the request.
        private async Task TryQueueTempPasswordAsync(User user, string tempPassword)
        {
            try { await _firstLogin.SendTemporaryPasswordAsync(user, tempPassword); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "User {UserId} created but the temporary password email could not be queued.", user.UserId);
            }
        }

    }
    
}
