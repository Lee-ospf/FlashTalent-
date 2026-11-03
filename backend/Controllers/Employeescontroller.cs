using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // HR-side endpoints. Recruiters/Admins act as HR for now.
    [ApiController]
    [Route("api/[controller]")]
    
    public class EmployeesController : TalentHubControllerBase
    {
        private readonly IEmployeeOnboardingService _onboarding;

        public EmployeesController(AppDbContext db, IEmployeeOnboardingService onboarding) : base(db)
        {
            _onboarding = onboarding;
        }

        // POST api/employees/onboarding-complete
        // The contract the onboarding system will call once integrated. Until then,
        // a recruiter/admin triggers it by hand ("mark as onboarded").
        [HttpPost("onboarding-complete")]
        [Authorize(Roles = "Recruiter,Admin")]
        public async Task<ActionResult<OnboardingCompleteResponse>> OnboardingComplete(OnboardingCompleteRequest request)
        {
            var result = await _onboarding.CompleteAsync(request);

            return result.Outcome switch
            {
                OnboardingOutcome.Created =>
                    CreatedAtAction(nameof(GetById), new { id = result.Data!.EmployeeId }, result.Data),
                OnboardingOutcome.AlreadyOnboarded => Ok(result.Data),
                OnboardingOutcome.ApplicationNotFound => NotFound(new { message = result.Message }),
                OnboardingOutcome.NotHired => BadRequest(new { message = result.Message }),
                OnboardingOutcome.InvalidDetails => BadRequest(new { message = result.Message }),
                OnboardingOutcome.Conflict => Conflict(new { message = result.Message }),
                _ => StatusCode(500, new { message = "Unexpected onboarding result." })
            };
        }

        // GET api/employees/awaiting-onboarding
        // Hired applications with no Employee record yet ("Hired, awaiting onboarding").
        // Derived - no extra status. Oldest first, so anyone who has waited longest is at the top.
        [Authorize(Roles = "Recruiter,Admin")]
        [HttpGet("awaiting-onboarding")]
        public async Task<ActionResult<List<AwaitingOnboardingItem>>> GetAwaitingOnboarding()
        {
            var items = await Db.Applications
                .AsNoTracking()
                .Where(a => a.Status == ApplicationStatus.Hired
                    && !Db.Employees.Any(e => e.SourceApplicationId == a.ApplicationId))
                .OrderBy(a => a.UpdatedAt)
                .Select(a => new AwaitingOnboardingItem
                {
                    ApplicationId = a.ApplicationId,
                    CandidateId = a.CandidateId,
                    CandidateName = a.Candidate!.User!.FirstName + " " + a.Candidate.User.LastName,
                    Email = a.Candidate.User.Email,
                    VacancyTitle = a.Vacancy!.Title,
                    HiredAt = a.UpdatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/employees?search=...&departmentId=...
        [Authorize(Roles = "Recruiter,HR,Admin")]
        [HttpGet]
        public async Task<ActionResult<List<EmployeeListItem>>> GetAll(
            [FromQuery] string? search, [FromQuery] int? departmentId)
        {
            var query = Db.Employees.AsNoTracking().AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(e =>
                    e.User!.FirstName.Contains(s) ||
                    e.User!.LastName.Contains(s) ||
                    e.User!.Email.Contains(s) ||
                    (e.JobTitle != null && e.JobTitle.Contains(s)));
            }

            var items = await query
                .OrderBy(e => e.User!.LastName).ThenBy(e => e.User!.FirstName)
                .Select(e => new EmployeeListItem
                {
                    EmployeeId = e.EmployeeId,
                    FirstName = e.User!.FirstName,
                    LastName = e.User!.LastName,
                    Email = e.User!.Email,
                    JobTitle = e.JobTitle,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : null,
                    HireDate = e.HireDate,
                    Status = e.Status
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/employees/{id}
        // Full profile, read-only for HR.
        [Authorize(Roles = "Recruiter,HR,Admin")]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EmployeeProfileResponse>> GetById(int id)
        {
            var employee = await Db.Employees
                .AsNoTracking()
                .WithProfile()
                .AsSplitQuery()
                .FirstOrDefaultAsync(e => e.EmployeeId == id);

            if (employee == null)
                return NotFound(new { message = $"No employee found with EmployeeId {id}." });

            return Ok(EmployeeProfileMapper.ToResponse(employee));
        }

        // GET api/employees/me/projects              all projects the signed-in employee is a member of
        // GET api/employees/me/projects?status=Active   only active ones
        [Authorize(Roles = "Employee")]
        [HttpGet("me/projects")]
        public async Task<ActionResult<List<EmployeeProjectResponse>>> GetMyProjects([FromQuery] ProjectStatus? status)
        {
            // The signed-in user's own employee record. The employee id is never taken from the client.
            var employeeId = await Db.Employees
                .AsNoTracking()
                .Where(e => e.UserId == CurrentUserId)
                .Select(e => (int?)e.EmployeeId)
                .FirstOrDefaultAsync();

            if (employeeId == null)
                return Ok(new List<EmployeeProjectResponse>()); // no employee record means no projects

            var query = Db.ProjectMembers
                .AsNoTracking()
                .Where(pm => pm.EmployeeId == employeeId.Value);

            if (status.HasValue)
                query = query.Where(pm => pm.Project!.Status == status.Value);

            var items = await query
                .OrderByDescending(pm => pm.AddedAt)
                .Select(pm => new EmployeeProjectResponse
                {
                    ProjectId = pm.ProjectId,
                    Name = pm.Project!.Name,
                    Description = pm.Project.Description,
                    Status = pm.Project.Status,
                    DepartmentName = pm.Project.Department != null ? pm.Project.Department.Name : null,
                    StartDate = pm.Project.StartDate,
                    EndDate = pm.Project.EndDate,
                    AddedAt = pm.AddedAt,
                    MemberCount = pm.Project.Members.Count,
                    Skills = pm.Project.ProjectSkills
                        .OrderByDescending(ps => ps.IsRequired)
                        .ThenBy(ps => ps.Skill!.Name)
                        .Select(ps => new EmployeeProjectSkillResponse
                        {
                            SkillId = ps.SkillId,
                            SkillName = ps.Skill!.Name,
                            IsRequired = ps.IsRequired,
                            MinimumLevel = ps.MinimumLevel
                        })
                        .ToList()
                })
                .ToListAsync();

            return Ok(items);
        }
    }
}