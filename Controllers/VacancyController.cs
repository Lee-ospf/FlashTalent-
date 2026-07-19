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
    public class VacancyController : TalentHubControllerBase
    {
        public VacancyController(AppDbContext db) : base(db)
        {
        }

        // Resolves the logged-in recruiter's own RecruiterId from their token.
        // Used only to attribute a vacancy to its creator - NOT used to restrict who can edit/manage it.
        // Any Recruiter can manage any vacancy (shared team pool), per team decision.
        private async Task<int?> GetCurrentRecruiterId()
        {
            return await Db.Recruiters
                .Where(r => r.UserId == CurrentUserId)
                .Select(r => (int?)r.RecruiterId)
                .FirstOrDefaultAsync();
        }

        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateJob([FromBody] CreateVacancyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Recruiters always create vacancies as themselves - RecruiterId in the body is ignored for them.
            // Admins may specify any RecruiterId (e.g. setting up a vacancy on a recruiter's behalf).
            int recruiterId;
            if (User.IsInRole("Admin"))
            {
                recruiterId = dto.RecruiterId;
            }
            else
            {
                var ownRecruiterId = await GetCurrentRecruiterId();
                if (ownRecruiterId == null)
                    return BadRequest("Your account has no recruiter profile.");
                recruiterId = ownRecruiterId.Value;
            }

            var recruiterExists = await Db.Recruiters.AnyAsync(r => r.RecruiterId == recruiterId);
            if (!recruiterExists)
                return BadRequest($"Recruiter with ID {recruiterId} does not exist.");

            if (dto.VacancyType == VacancyType.Internal.ToString() && dto.DepartmentId is null)
                return BadRequest("DepartmentId is required for internal vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString() && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.SalaryMin.HasValue && dto.SalaryMax.HasValue && dto.SalaryMin > dto.SalaryMax)
                return BadRequest("SalaryMin cannot be greater than SalaryMax.");
            if (dto.VacancyType == VacancyType.Internal.ToString())
            {
                var departmentExists = await Db.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString())
            {
                var clientExists = await Db.Clients.AnyAsync(c => c.ClientId == dto.ClientId);
                if (!clientExists)
                    return BadRequest($"Client with ID {dto.ClientId} does not exist.");
            }
            if (string.IsNullOrWhiteSpace(dto.Location))
                return BadRequest("Location is required.");

            if (dto.ClosingDate is null)
                return BadRequest("Closing Date is required.");

            if (string.IsNullOrWhiteSpace(dto.RequiredQualifications))
                return BadRequest("Qualifications are required.");

            if (dto.MinYearsExperience is null)
                return BadRequest("Experience is required.");

            if (dto.Skills is null || !dto.Skills.Any())
                return BadRequest("At least one required skill must be specified.");

            var vacancy = new Vacancy
            {
                Title = dto.Title,
                Description = dto.Description,
                VacancyType = Enum.Parse<VacancyType>(dto.VacancyType, ignoreCase: true),
                DepartmentId = dto.VacancyType == VacancyType.Internal.ToString() ? dto.DepartmentId : null,
                ClientId = dto.VacancyType == VacancyType.ClientPlacement.ToString() ? dto.ClientId : null,
                EmploymentType = dto.EmploymentType,
                SalaryMin = dto.SalaryMin,
                SalaryMax = dto.SalaryMax,
                Location = dto.Location,
                ClosingDate = dto.ClosingDate,
                MinYearsExperience = dto.MinYearsExperience,
                RequiredQualifications = dto.RequiredQualifications,
                Requirements = dto.Requirements,
                CreatedByRecruiterId = recruiterId,
                Status = VacancyStatus.Draft
            };

            // Attach skills with proficiency level
            var skillIds = dto.Skills.Select(s => s.SkillId).ToList();

            var validSkillIds = await Db.Skills
                .Where(s => skillIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToHashSetAsync();

            vacancy.VacancySkills = dto.Skills
                .Where(s => validSkillIds.Contains(s.SkillId))
                .Select(s => new VacancySkill
                {
                    SkillId = s.SkillId,
                    IsRequired = s.IsRequired,
                    ProficiencyLevel = s.ProficiencyLevel
                })
                .ToList();

            vacancy.RequiredDocuments = dto.RequiredDocuments
                .Select(rd => new VacancyDocument
                {
                    DocumentType = Enum.Parse<DocumentType>(rd.DocumentType, ignoreCase: true),
                    IsMandatory = rd.IsMandatory
                })
                .ToList();

            Db.Vacancies.Add(vacancy);
            await Db.SaveChangesAsync();

            Db.VacancyChangeHistories.Add(new VacancyChangeHistory
            {
                VacancyId = vacancy.VacancyId,
                VacancyTitle = vacancy.Title,
                Action = "Created",
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // PUT: api/Vacancy/5/edit
        // Full replacement of an editable vacancy's content fields. Restricted to Draft vacancies.
        // Any Recruiter or Admin can edit any vacancy (shared team pool).
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPut("{id}/edit")]
        public async Task<IActionResult> UpdateVacancy(int id, [FromBody] UpdateVacancyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var vacancy = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status != VacancyStatus.Draft)
                return BadRequest("Only vacancies in Draft status can be edited.");

            if (dto.VacancyType == VacancyType.Internal.ToString() && dto.DepartmentId is null)
                return BadRequest("DepartmentId is required for internal vacancies.");

            if (dto.VacancyType == VacancyType.Internal.ToString())
            {
                var departmentExists = await Db.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString() && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString())
            {
                var clientExists = await Db.Clients.AnyAsync(c => c.ClientId == dto.ClientId);
                if (!clientExists)
                    return BadRequest($"Client with ID {dto.ClientId} does not exist.");
            }

            if (dto.SalaryMin.HasValue && dto.SalaryMax.HasValue && dto.SalaryMin > dto.SalaryMax)
                return BadRequest("SalaryMin cannot be greater than SalaryMax.");
            if (string.IsNullOrWhiteSpace(dto.Location))
                return BadRequest("Location is required.");

            if (dto.ClosingDate is null)
                return BadRequest("Closing Date is required.");

            if (dto.ClosingDate <= DateTime.UtcNow)
                return BadRequest("The closing Date must be in the future");

            if (string.IsNullOrWhiteSpace(dto.RequiredQualifications))
                return BadRequest("Qualifications are required.");

            if (dto.MinYearsExperience is null)
                return BadRequest("Experience is required.");

            if (dto.Skills is null || !dto.Skills.Any())
                return BadRequest("At least one required skill must be specified.");

            // Snapshot the "before" values so we can build a human-readable diff after applying changes.
            var before = new
            {
                vacancy.Title,
                vacancy.Description,
                vacancy.EmploymentType,
                vacancy.SalaryMin,
                vacancy.SalaryMax,
                vacancy.Location,
                vacancy.ClosingDate,
                vacancy.MinYearsExperience,
                vacancy.RequiredQualifications,
                vacancy.Requirements,
                SkillIds = vacancy.VacancySkills.Select(vs => vs.SkillId).OrderBy(id => id).ToList(),
                DocTypes = vacancy.RequiredDocuments.Select(rd => rd.DocumentType.ToString()).OrderBy(t => t).ToList()
            };

            vacancy.Title = dto.Title;
            vacancy.Description = dto.Description;
            vacancy.VacancyType = Enum.Parse<VacancyType>(dto.VacancyType, ignoreCase: true);
            vacancy.DepartmentId = dto.VacancyType == VacancyType.Internal.ToString() ? dto.DepartmentId : null;
            vacancy.ClientId = dto.VacancyType == VacancyType.ClientPlacement.ToString() ? dto.ClientId : null;
            vacancy.EmploymentType = dto.EmploymentType;
            vacancy.SalaryMin = dto.SalaryMin;
            vacancy.SalaryMax = dto.SalaryMax;
            vacancy.Location = dto.Location;
            vacancy.ClosingDate = dto.ClosingDate;
            vacancy.MinYearsExperience = dto.MinYearsExperience;
            vacancy.RequiredQualifications = dto.RequiredQualifications;
            vacancy.Requirements = dto.Requirements;

            // Replace skills entirely
            var skillIds = dto.Skills.Select(s => s.SkillId).ToList();

            var validSkillIds = await Db.Skills
                .Where(s => skillIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToHashSetAsync();

            vacancy.VacancySkills.Clear();
            vacancy.VacancySkills = dto.Skills
                .Where(s => validSkillIds.Contains(s.SkillId))
                .Select(s => new VacancySkill
                {
                    VacancyId = vacancy.VacancyId,
                    SkillId = s.SkillId,
                    IsRequired = s.IsRequired,
                    ProficiencyLevel = s.ProficiencyLevel
                })
                .ToList();

            // required documents 
            vacancy.RequiredDocuments.Clear();
            vacancy.RequiredDocuments = dto.RequiredDocuments
                .Select(rd => new VacancyDocument
                {
                    VacancyId = vacancy.VacancyId,
                    DocumentType = Enum.Parse<DocumentType>(rd.DocumentType, ignoreCase: true),
                    IsMandatory = rd.IsMandatory
                })
                .ToList();

            await Db.SaveChangesAsync();

            var changes = new List<string>();
            if (before.Title != vacancy.Title) changes.Add($"Title: '{before.Title}' → '{vacancy.Title}'");
            if (before.Description != vacancy.Description) changes.Add("Description updated");
            if (before.EmploymentType != vacancy.EmploymentType) changes.Add($"Employment type: {before.EmploymentType} → {vacancy.EmploymentType}");
            if (before.SalaryMin != vacancy.SalaryMin) changes.Add($"Salary min: {before.SalaryMin?.ToString() ?? "—"} → {vacancy.SalaryMin?.ToString() ?? "—"}");
            if (before.SalaryMax != vacancy.SalaryMax) changes.Add($"Salary max: {before.SalaryMax?.ToString() ?? "—"} → {vacancy.SalaryMax?.ToString() ?? "—"}");
            if (before.Location != vacancy.Location) changes.Add($"Location: '{before.Location}' → '{vacancy.Location}'");
            if (before.ClosingDate != vacancy.ClosingDate) changes.Add($"Closing date: {before.ClosingDate?.ToString("d") ?? "—"} → {vacancy.ClosingDate?.ToString("d") ?? "—"}");
            if (before.MinYearsExperience != vacancy.MinYearsExperience) changes.Add($"Min experience: {before.MinYearsExperience?.ToString() ?? "—"} → {vacancy.MinYearsExperience?.ToString() ?? "—"} yrs");
            if (before.RequiredQualifications != vacancy.RequiredQualifications) changes.Add("Required qualifications updated");
            if (before.Requirements != vacancy.Requirements) changes.Add("Requirements updated");

            var newSkillIds = dto.Skills.Select(s => s.SkillId).OrderBy(id => id).ToList();
            if (!before.SkillIds.SequenceEqual(newSkillIds)) changes.Add("Required skills updated");

            var newDocTypes = dto.RequiredDocuments.Select(rd => rd.DocumentType).OrderBy(t => t).ToList();
            if (!before.DocTypes.SequenceEqual(newDocTypes)) changes.Add("Required documents updated");

            Db.VacancyChangeHistories.Add(new VacancyChangeHistory
            {
                VacancyId = vacancy.VacancyId,
                VacancyTitle = vacancy.Title,
                Action = "Edited",
                Details = changes.Count > 0 ? string.Join("; ", changes) : "No field changes detected",
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // PATCH: api/Vacancy/5/publish
        // Any Recruiter or Admin (shared team pool).
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPatch("{id}/publish")]
        public async Task<IActionResult> PublishVacancy(int id)
        {
            var vacancy = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status == VacancyStatus.Published)
                return BadRequest("This vacancy is already published.");

            if (vacancy.Status == VacancyStatus.Closed)
                return BadRequest("A closed vacancy cannot be republished.");

            Db.VacancyChangeHistories.Add(new VacancyChangeHistory
            {
                VacancyId = vacancy.VacancyId,
                VacancyTitle = vacancy.Title,
                Action = "Published",
                Details = $"Status: {vacancy.Status} → Published",
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });

            vacancy.Status = VacancyStatus.Published;
            vacancy.PublishedAt = DateTime.UtcNow;

            await Db.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // GET: api/Vacancy/published
        // Candidate-facing endpoint - any authenticated role can browse published vacancies.
        [HttpGet("published")]
        public async Task<ActionResult<List<VacancyResponse>>> GetPublishedVacancies()
        {
            var now = DateTime.UtcNow;
            var vacancies = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .Where(v => v.Status == VacancyStatus.Published &&
                            (!v.ClosingDate.HasValue || v.ClosingDate.Value > now))
                .ToListAsync();

            var result = vacancies.Select(v => MapToResponse(v)).ToList();
            return Ok(result);
        }

        // PATCH: api/Vacancy/5/close
        // Any Recruiter or Admin (shared team pool).
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpPatch("{id}/close")]
        public async Task<IActionResult> CloseVacancy(int id)
        {
            var vacancy = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status == VacancyStatus.Closed)
                return BadRequest("This vacancy is already closed.");

            Db.VacancyChangeHistories.Add(new VacancyChangeHistory
            {
                VacancyId = vacancy.VacancyId,
                VacancyTitle = vacancy.Title,
                Action = "Closed",
                Details = $"Status: {vacancy.Status} → Closed",
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });

            vacancy.Status = VacancyStatus.Closed;

            await Db.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // GET: api/Vacancy/GetVacancyByStatus.
        // Internal view (draft/published/closed) - Recruiter/Admin only.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("GetVacancyByStatus.")]
        public async Task<ActionResult<List<VacancyResponse>>> GetAllVacancies([FromQuery] VacancyStatus? status = null)
        {
            var query = Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(v => v.Status == status.Value);

            var vacancies = await query.ToListAsync();
            var result = vacancies.Select(v => MapToResponse(v)).ToList();

            return Ok(result);
        }

        // GET: api/Vacancy/5
        // Any authenticated role - but Candidates only get to see Published vacancies this way.
        // Prevents a candidate from viewing a Draft/Closed vacancy's details by guessing an ID.
        [HttpGet("{id}")]
        public async Task<ActionResult<VacancyResponse>> GetVacancyById(int id)
        {
            var vacancy = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Recruiter");
            if (!isPrivileged && vacancy.Status != VacancyStatus.Published)
                return NotFound($"Vacancy with ID {id} not found.");

            return Ok(MapToResponse(vacancy));
        }

        // DELETE: api/Vacancy/5
        // Only Draft vacancies can be deleted. Any Recruiter or Admin can delete (shared team pool).
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacancy(int id)
        {
            var vacancy = await Db.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status != VacancyStatus.Draft)
                return BadRequest("Only vacancies in Draft status can be deleted.");

            Db.VacancyChangeHistories.Add(new VacancyChangeHistory
            {
                VacancyId = vacancy.VacancyId,
                VacancyTitle = vacancy.Title,
                Action = "Deleted",
                ChangedByUserId = CurrentUserId,
                ChangedAt = DateTime.UtcNow
            });

            Db.Vacancies.Remove(vacancy);
            await Db.SaveChangesAsync();

            return NoContent();
        }
        // GET: api/Vacancy/5/history
        // Recruiter/Admin only - shows who created/edited/published/closed/deleted this vacancy and when.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetHistory(int id)
        {
            var history = await Db.VacancyChangeHistories
                .Include(h => h.ChangedByUser)
                .Where(h => h.VacancyId == id)
                .OrderBy(h => h.ChangedAt)
                .Select(h => new
                {
                    h.VacancyChangeHistoryId,
                    h.VacancyId,
                    h.VacancyTitle,
                    h.Action,
                    h.Details,
                    ChangedByName = h.ChangedByUser != null ? $"{h.ChangedByUser.FirstName} {h.ChangedByUser.LastName}" : "Unknown",
                    h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        private static VacancyResponse MapToResponse(Vacancy v)
        {
            return new VacancyResponse
            {
                VacancyId = v.VacancyId,
                Title = v.Title,
                Description = v.Description,
                VacancyType = v.VacancyType.ToString(),
                DepartmentId = v.DepartmentId,
                ClientId = v.ClientId,
                EmploymentType = v.EmploymentType.ToString(),
                SalaryMin = v.SalaryMin,
                SalaryMax = v.SalaryMax,
                Location = v.Location,
                ClosingDate = v.ClosingDate,
                MinYearsExperience = v.MinYearsExperience,
                RequiredQualifications = v.RequiredQualifications,
                Requirements = v.Requirements,
                Status = v.Status.ToString(),
                CreatedByRecruiterId = v.CreatedByRecruiterId,
                CreatedAt = v.CreatedAt,
                PublishedAt = v.PublishedAt,
                Skills = v.VacancySkills?.Select(vs => new VacancySkillDto
                {
                    SkillId = vs.SkillId,
                    IsRequired = vs.IsRequired,
                    ProficiencyLevel = vs.ProficiencyLevel
                }).ToList() ?? new(),
                RequiredDocuments = v.RequiredDocuments?.Select(rd => new RequiredDocumentDto
                {
                    DocumentType = rd.DocumentType.ToString(),
                    IsMandatory = rd.IsMandatory
                }).ToList() ?? new()
            };
        }

    }
}