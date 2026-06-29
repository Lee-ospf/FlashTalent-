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

        [HttpPost]
        public async Task<IActionResult> CreateJob([FromBody] CreateVacancyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var recruiterExists = await _context.Recruiters.AnyAsync(r => r.RecruiterId == dto.RecruiterId);
            if (!recruiterExists)
                return BadRequest($"Recruiter with ID {dto.RecruiterId} does not exist.");

            if (dto.VacancyType == VacancyType.Internal && dto.DepartmentId is null)
                return BadRequest("DepartmentId is required for internal vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.SalaryMin.HasValue && dto.SalaryMax.HasValue && dto.SalaryMin > dto.SalaryMax)
                return BadRequest("SalaryMin cannot be greater than SalaryMax.");
            if (dto.VacancyType == VacancyType.Internal)
            {
                var departmentExists = await _context.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement)
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

            if (dto.SkillIds is null || !dto.SkillIds.Any())
                return BadRequest("At least one required skill must be specified.");
            var vacancy = new Vacancy
            {
                Title = dto.Title,
                Description = dto.Description,
                VacancyType = dto.VacancyType,
                DepartmentId = dto.VacancyType == VacancyType.Internal ? dto.DepartmentId : null,
                ClientId = dto.VacancyType == VacancyType.ClientPlacement ? dto.ClientId : null,
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

      
                var validSkillIds = await _context.Skills
                    .Where(s => dto.SkillIds.Contains(s.SkillId))
                    .Select(s => s.SkillId)
                    .ToListAsync();

                vacancy.VacancySkills = validSkillIds
                    .Select(id => new VacancySkill { SkillId = id })
                    .ToList();
            

            vacancy.RequiredDocuments = dto.RequiredDocuments
                .Select(rd => new VacancyDocument
                {
                    DocumentType = rd.DocumentType,
                    IsMandatory = rd.IsMandatory
                })
                .ToList();

            _context.Vacancies.Add(vacancy);
            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }

        // PATCH: api/Vacancy/5/publish
        // Using PATCH instead of PUT because this is a partial, action-style state change
        // (Draft -> Published) with its own business rules and a side-effect (PublishedAt),
        // not a full replacement of the vacancy resource. Keeping it separate from a general
        // Update endpoint avoids mixing "edit a field" logic with "change lifecycle state" logic.
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
        // PUT: api/Vacancy/5
        // Full replacement of an editable vacancy's content fields. Restricted to Draft vacancies

        [HttpPut("{id}")]
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

            if (dto.VacancyType == VacancyType.Internal && dto.DepartmentId is null)
                return BadRequest("DepartmentId is required for internal vacancies.");

            if (dto.VacancyType == VacancyType.Internal)
            {
                var departmentExists = await _context.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
                if (!departmentExists)
                    return BadRequest($"Department with ID {dto.DepartmentId} does not exist.");
            }

            if (dto.VacancyType == VacancyType.ClientPlacement && dto.ClientId is null)
                return BadRequest("ClientId is required for client placement vacancies.");

            if (dto.VacancyType == VacancyType.ClientPlacement)
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

            if (string.IsNullOrWhiteSpace(dto.RequiredQualifications))
                return BadRequest("Qualifications are required.");

            if (dto.MinYearsExperience is null)
                return BadRequest("Experience is required.");

            if (dto.SkillIds is null || !dto.SkillIds.Any())
                return BadRequest("At least one required skill must be specified.");

            vacancy.Title = dto.Title;
            vacancy.Description = dto.Description;
            vacancy.VacancyType = dto.VacancyType;
            vacancy.DepartmentId = dto.VacancyType == VacancyType.Internal ? dto.DepartmentId : null;
            vacancy.ClientId = dto.VacancyType == VacancyType.ClientPlacement ? dto.ClientId : null;
            vacancy.EmploymentType = dto.EmploymentType;
            vacancy.SalaryMin = dto.SalaryMin;
            vacancy.SalaryMax = dto.SalaryMax;
            vacancy.Location = dto.Location;
            vacancy.ClosingDate = dto.ClosingDate;
            vacancy.MinYearsExperience = dto.MinYearsExperience;
            vacancy.RequiredQualifications = dto.RequiredQualifications;
            vacancy.Requirements = dto.Requirements;

            // Replace skills entirely
            var validSkillIds = await _context.Skills
                .Where(s => dto.SkillIds.Contains(s.SkillId))
                .Select(s => s.SkillId)
                .ToListAsync();

            vacancy.VacancySkills.Clear();
            vacancy.VacancySkills = validSkillIds
                .Select(skillId => new VacancySkill { VacancyId = vacancy.VacancyId, SkillId = skillId })
                .ToList();

            // Replace required documents entirely
            vacancy.RequiredDocuments.Clear();
            vacancy.RequiredDocuments = dto.RequiredDocuments
                .Select(rd => new VacancyDocument
                {
                    VacancyId = vacancy.VacancyId,
                    DocumentType = rd.DocumentType,
                    IsMandatory = rd.IsMandatory
                })
                .ToList();

            await _context.SaveChangesAsync();

            return Ok(MapToResponse(vacancy));
        }
        // GET: api/Vacancy
        // Returns all the vacancies(draft, published or closed, this is to accessed by recruiter, admin or HR
        [HttpGet]
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
                SkillIds = v.VacancySkills?.Select(vs => vs.SkillId).ToList() ?? new(),
                RequiredDocuments = v.RequiredDocuments?.Select(rd => new RequiredDocumentDto
                {
                    DocumentType = rd.DocumentType,
                    IsMandatory = rd.IsMandatory
                }).ToList() ?? new()
            };
        }
    }
}
