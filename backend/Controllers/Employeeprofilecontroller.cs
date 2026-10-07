using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Employee self-service. The employee is ALWAYS resolved from the logged-in user -
    // there is no employee id in these URLs, so nobody can touch another profile.
    // Changes save immediately (no approval step).
    [ApiController]
    [Route("api/employees/me")]
    [Authorize(Roles = "Employee")]
    public class EmployeeProfileController : TalentHubControllerBase
    {
        public EmployeeProfileController(AppDbContext db) : base(db)
        {
        }

        private Task<Employee?> GetMyEmployeeAsync()
            => Db.Employees.FirstOrDefaultAsync(e => e.UserId == CurrentUserId);

        private NotFoundObjectResult NoProfile()
            => NotFound(new { message = "No employee profile exists for this account." });

        // ================= Whole profile =================

        // GET api/employees/me
        [HttpGet]
        public async Task<ActionResult<EmployeeProfileResponse>> GetMyProfile()
        {
            var response = await LoadProfileAsync();
            if (response == null) return NoProfile();
            return Ok(response);
        }

        // PUT api/employees/me/personal
        // Personal details live on the User, shared with the candidate side.
        [HttpPut("personal")]
        public async Task<ActionResult<EmployeeProfileResponse>> UpdatePersonalDetails(UpdatePersonalDetailsRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            if (request.DateOfBirth > DateTime.UtcNow)
                return BadRequest(new { message = "Date of Birth cannot be in the future." });

            var age = DateTime.UtcNow.Year - request.DateOfBirth.Year;
            if (request.DateOfBirth.Date > DateTime.UtcNow.AddYears(-age).Date) age--;
            if (age < 18)
                return BadRequest(new { message = "You must be at least 18 years old." });

            var user = await Db.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound(new { message = "User account not found." });

            user.Phone = request.Phone;
            user.Gender = request.Gender;
            user.Race = request.Race;
            user.Nationality = request.Nationality;
            user.DateOfBirth = request.DateOfBirth;
            user.UpdatedAt = DateTime.UtcNow;

            await Db.SaveChangesAsync();

            return Ok(await LoadProfileAsync());
        }

        // ================= Skills =================

        // GET api/employees/me/skills
        [HttpGet("skills")]
        public async Task<ActionResult<List<EmployeeSkillDto>>> GetSkills()
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var skills = await Db.EmployeeSkills.AsNoTracking()
                .Include(es => es.Skill)
                .Where(es => es.EmployeeId == employee.EmployeeId)
                .ToListAsync();

            return Ok(skills
                .Where(es => es.Skill != null)
                .OrderBy(es => es.Skill!.Name)
                .Select(es => EmployeeProfileMapper.ToSkillDto(es, es.Skill!))
                .ToList());
        }

        // POST api/employees/me/skills
        [HttpPost("skills")]
        public async Task<ActionResult<EmployeeSkillDto>> AddSkill(AddEmployeeSkillRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var skill = await Db.Skills.FindAsync(request.SkillId);
            if (skill == null)
                return NotFound(new { message = $"No skill found with SkillId {request.SkillId}." });

            var duplicate = await Db.EmployeeSkills
                .AnyAsync(es => es.EmployeeId == employee.EmployeeId && es.SkillId == request.SkillId);
            if (duplicate)
                return Conflict(new { message = "This skill is already on your profile." });

            var entry = new EmployeeSkill
            {
                EmployeeId = employee.EmployeeId,
                SkillId = skill.SkillId,
                ProficiencyLevel = request.ProficiencyLevel
            };

            Db.EmployeeSkills.Add(entry);
            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToSkillDto(entry, skill));
        }

        // PUT api/employees/me/skills/{id}
        [HttpPut("skills/{id:int}")]
        public async Task<ActionResult<EmployeeSkillDto>> UpdateSkill(int id, UpdateEmployeeSkillRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeSkills.Include(es => es.Skill)
                .FirstOrDefaultAsync(es => es.EmployeeSkillId == id && es.EmployeeId == employee.EmployeeId);
            if (entry == null || entry.Skill == null)
                return NotFound(new { message = $"No skill entry found with id {id} on your profile." });

            entry.ProficiencyLevel = request.ProficiencyLevel;
            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToSkillDto(entry, entry.Skill));
        }

        // DELETE api/employees/me/skills/{id}
        [HttpDelete("skills/{id:int}")]
        public async Task<IActionResult> DeleteSkill(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeSkills
                .FirstOrDefaultAsync(es => es.EmployeeSkillId == id && es.EmployeeId == employee.EmployeeId);
            if (entry == null)
                return NotFound(new { message = $"No skill entry found with id {id} on your profile." });

            Db.EmployeeSkills.Remove(entry);
            await Db.SaveChangesAsync();

            return NoContent();
        }

        // ================= Qualifications & certifications =================

        // GET api/employees/me/qualifications
        [HttpGet("qualifications")]
        public async Task<ActionResult<List<EmployeeQualificationDto>>> GetQualifications()
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var items = await Db.EmployeeQualifications.AsNoTracking()
                .Where(q => q.EmployeeId == employee.EmployeeId)
                .OrderByDescending(q => q.YearCompleted)
                .ToListAsync();

            return Ok(items.Select(EmployeeProfileMapper.ToQualificationDto).ToList());
        }

        // POST api/employees/me/qualifications
        [HttpPost("qualifications")]
        public async Task<ActionResult<EmployeeQualificationDto>> AddQualification(EmployeeQualificationRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var error = ValidateQualification(request);
            if (error != null) return BadRequest(new { message = error });

            var entry = new EmployeeQualification
            {
                EmployeeId = employee.EmployeeId,
                QualificationType = request.QualificationType,
                Name = request.Name.Trim(),
                Institution = request.Institution.Trim(),
                YearCompleted = request.YearCompleted,
                ExpiryDate = request.ExpiryDate
            };

            Db.EmployeeQualifications.Add(entry);
            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToQualificationDto(entry));
        }

        // PUT api/employees/me/qualifications/{id}
        [HttpPut("qualifications/{id:int}")]
        public async Task<ActionResult<EmployeeQualificationDto>> UpdateQualification(int id, EmployeeQualificationRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeQualifications
                .FirstOrDefaultAsync(q => q.EmployeeQualificationId == id && q.EmployeeId == employee.EmployeeId);
            if (entry == null)
                return NotFound(new { message = $"No qualification found with id {id} on your profile." });

            var error = ValidateQualification(request);
            if (error != null) return BadRequest(new { message = error });

            entry.QualificationType = request.QualificationType;
            entry.Name = request.Name.Trim();
            entry.Institution = request.Institution.Trim();
            entry.YearCompleted = request.YearCompleted;
            entry.ExpiryDate = request.ExpiryDate;
            entry.UpdatedAt = DateTime.UtcNow;

            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToQualificationDto(entry));
        }

        // DELETE api/employees/me/qualifications/{id}
        [HttpDelete("qualifications/{id:int}")]
        public async Task<IActionResult> DeleteQualification(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeQualifications
                .FirstOrDefaultAsync(q => q.EmployeeQualificationId == id && q.EmployeeId == employee.EmployeeId);
            if (entry == null)
                return NotFound(new { message = $"No qualification found with id {id} on your profile." });

            Db.EmployeeQualifications.Remove(entry);
            await Db.SaveChangesAsync();

            return NoContent();
        }

        // ================= Work history (pre-hire) =================

        // GET api/employees/me/experience
        [HttpGet("experience")]
        public async Task<ActionResult<List<EmployeeExperienceDto>>> GetExperience()
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var items = await Db.EmployeeExperiences.AsNoTracking()
                .Where(x => x.EmployeeId == employee.EmployeeId)
                .OrderByDescending(x => x.StartDate)
                .ToListAsync();

            return Ok(items.Select(EmployeeProfileMapper.ToExperienceDto).ToList());
        }

        // POST api/employees/me/experience
        [HttpPost("experience")]
        public async Task<ActionResult<EmployeeExperienceDto>> AddExperience(EmployeeExperienceRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var error = ValidateExperience(request);
            if (error != null) return BadRequest(new { message = error });

            var entry = new EmployeeExperience
            {
                EmployeeId = employee.EmployeeId,
                Company = request.Company.Trim(),
                Role = request.Role.Trim(),
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ProjectsAndDuties = request.ProjectsAndDuties
            };

            Db.EmployeeExperiences.Add(entry);
            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToExperienceDto(entry));
        }

        // PUT api/employees/me/experience/{id}
        [HttpPut("experience/{id:int}")]
        public async Task<ActionResult<EmployeeExperienceDto>> UpdateExperience(int id, EmployeeExperienceRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeExperiences
                .FirstOrDefaultAsync(x => x.EmployeeExperienceId == id && x.EmployeeId == employee.EmployeeId);
            if (entry == null)
                return NotFound(new { message = $"No work history entry found with id {id} on your profile." });

            var error = ValidateExperience(request);
            if (error != null) return BadRequest(new { message = error });

            entry.Company = request.Company.Trim();
            entry.Role = request.Role.Trim();
            entry.StartDate = request.StartDate;
            entry.EndDate = request.EndDate;
            entry.ProjectsAndDuties = request.ProjectsAndDuties;
            entry.UpdatedAt = DateTime.UtcNow;

            await Db.SaveChangesAsync();

            return Ok(EmployeeProfileMapper.ToExperienceDto(entry));
        }

        // DELETE api/employees/me/experience/{id}
        [HttpDelete("experience/{id:int}")]
        public async Task<IActionResult> DeleteExperience(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var entry = await Db.EmployeeExperiences
                .FirstOrDefaultAsync(x => x.EmployeeExperienceId == id && x.EmployeeId == employee.EmployeeId);
            if (entry == null)
                return NotFound(new { message = $"No work history entry found with id {id} on your profile." });

            Db.EmployeeExperiences.Remove(entry);
            await Db.SaveChangesAsync();

            return NoContent();
        }

        // ================= Helpers =================

        private async Task<EmployeeProfileResponse?> LoadProfileAsync()
        {
            var employee = await Db.Employees
                .AsNoTracking()
                .WithProfile()
                .AsSplitQuery()
                .FirstOrDefaultAsync(e => e.UserId == CurrentUserId);

            return employee == null ? null : EmployeeProfileMapper.ToResponse(employee);
        }

        // Returns an error message, or null when valid.
        private static string? ValidateQualification(EmployeeQualificationRequest r)
        {
            if (r.ExpiryDate.HasValue)
            {
                if (r.QualificationType != QualificationType.Certification)
                    return "An expiry date can only be set for certifications.";

                if (r.ExpiryDate.Value.Date <= r.YearCompleted.Date)
                    return "The expiry date must be after the date the certification was obtained.";
            }

            return null;
        }

        private static string? ValidateExperience(EmployeeExperienceRequest r)
        {
            if (r.StartDate.Date > DateTime.UtcNow.Date)
                return "Start date cannot be in the future.";

            if (r.EndDate.HasValue && r.EndDate.Value.Date < r.StartDate.Date)
                return "End date cannot be before the start date.";

            return null;
        }
    }
}