using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VacancyController : Controller

    {
        private readonly AppDbContext _context;
        public VacancyController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateJob([FromBody] CreateVacancyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var recruiterExists = await _context.Recruiters.AnyAsync(r => r.RecruiterId == dto.RecruiterId);
            if (!recruiterExists)
                return BadRequest($"Recruiter with ID {dto.RecruiterId} does not exist.");

            if (dto.VacancyType == VacancyType.Internal.ToString() && dto.DepartmentId is null)
                return BadRequest("DepartmentId is required for internal vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString() && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.SalaryMin.HasValue && dto.SalaryMax.HasValue && dto.SalaryMin > dto.SalaryMax)
                return BadRequest("SalaryMin cannot be greater than SalaryMax.");
            if (dto.VacancyType == VacancyType.Internal.ToString())
            {
                var departmentExists = await _context.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString())
            {
                var clientExists = await _context.Clients.AnyAsync(c => c.ClientId == dto.ClientId);
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
                CreatedByRecruiterId = dto.RecruiterId,
                Status = VacancyStatus.Draft
            };

            // Attach skills with proficiency level
            var skillIds = dto.Skills.Select(s => s.SkillId).ToList();

            var validSkillIds = await _context.Skills
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

            _context.Vacancies.Add(vacancy);
            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // PUT: api/Vacancy/5
        // Full replacement of an editable vacancy's content fields. Restricted to Draft vacancies

        [HttpPut("{id}/edit")]
        public async Task<IActionResult> UpdateVacancy(int id, [FromBody] UpdateVacancyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var vacancy = await _context.Vacancies
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
                var departmentExists = await _context.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString() && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement.ToString())
            {
                var clientExists = await _context.Clients.AnyAsync(c => c.ClientId == dto.ClientId);
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

            var validSkillIds = await _context.Skills
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

            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }
        // PATCH: api/Vacancy/5/publish
        // Using PATCH instead of PUT because this is a partial, action-style state change
        [HttpPatch("{id}/publish")]
        public async Task<IActionResult> PublishVacancy(int id)
        {
            var vacancy = await _context.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status == VacancyStatus.Published)
                return BadRequest("This vacancy is already published.");

            if (vacancy.Status == VacancyStatus.Closed)
                return BadRequest("A closed vacancy cannot be republished.");

            vacancy.Status = VacancyStatus.Published;
            vacancy.PublishedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }
        // GET: api/Vacancy/published
        // Candidate-facing endpoint. Returns only the published jobs this is to be accessed by candidates.
        [HttpGet("published")]
        public async Task<ActionResult<List<VacancyResponse>>> GetPublishedVacancies()
        {
            var vacancies = await _context.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .Where(v => v.Status == VacancyStatus.Published)
                .ToListAsync();

            var result = vacancies.Select(v => MapToResponse(v)).ToList();

            return Ok(result);
        }
        // PATCH: api/Vacancy/5/close
        // lifecycle transition
        // A vacancy can be closed from either Draft (recruiter cancels before it ever goes live)
        // or Published (position filled / no longer needed) — but not from Closed again.
        [HttpPatch("{id}/close")]
        public async Task<IActionResult> CloseVacancy(int id)
        {
            var vacancy = await _context.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status == VacancyStatus.Closed)
                return BadRequest("This vacancy is already closed.");

            vacancy.Status = VacancyStatus.Closed;

            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }
      
        // GET: api/Vacancy
        // Returns all the vacancies(draft, published or closed, this is to accessed by recruiter, admin or HR
        [HttpGet("GetVacancyByStatus.")]
        public async Task<ActionResult<List<VacancyResponse>>> GetAllVacancies([FromQuery] VacancyStatus? status = null)
        {
            var query = _context.Vacancies
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
        [HttpGet("{id}")]
        public async Task<ActionResult<VacancyResponse>> GetVacancyById(int id)
        {
            var vacancy = await _context.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            return Ok(MapToResponse(vacancy));
        }

        // DELETE: api/Vacancy/5
        // Only Draft vacancies can be deleted — Published/Closed vacancies are kept
        // as historical record and may have candidate applications attached.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacancy(int id)
        {
            var vacancy = await _context.Vacancies
                .Include(v => v.VacancySkills)
                .Include(v => v.RequiredDocuments)
                .FirstOrDefaultAsync(v => v.VacancyId == id);

            if (vacancy is null)
                return NotFound($"Vacancy with ID {id} not found.");

            if (vacancy.Status != VacancyStatus.Draft)
                return BadRequest("Only vacancies in Draft status can be deleted.");

            _context.Vacancies.Remove(vacancy);
            await _context.SaveChangesAsync();

            return NoContent();
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
