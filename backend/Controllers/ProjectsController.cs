using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    // HR and Admin manage projects. Shared pool: any HR user can see and edit any project.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "HR,Admin")]
    public class ProjectsController : TalentHubControllerBase
    {
        public ProjectsController(AppDbContext db) : base(db) { }

        // POST api/projects
        [HttpPost]
        public async Task<ActionResult<ProjectResponse>> Create(SaveProjectRequest request)
        {
            var error = await ValidateAsync(request);
            if (error != null)
                return BadRequest(new { message = error });

            var project = new Project
            {
                Name = request.Name.Trim(),
                Description = request.Description,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                RequiredQualifications = request.RequiredQualifications ?? string.Empty,
                Status = ProjectStatus.Active,
                DepartmentId = request.DepartmentId,
                CreatedByUserId = CurrentUserId,
                ProjectSkills = request.Skills.Select(s => new ProjectSkill
                {
                    SkillId = s.SkillId,
                    IsRequired = s.IsRequired,
                    MinimumLevel = s.MinimumLevel
                }).ToList()
            };

            Db.Projects.Add(project);
            await Db.SaveChangesAsync();

            var response = await LoadResponseAsync(project.ProjectId);
            return CreatedAtAction(nameof(GetById), new { id = project.ProjectId }, response);
        }

        // GET api/projects?status=Active&search=...
        [HttpGet]
        public async Task<ActionResult<List<ProjectListItem>>> GetAll(
            [FromQuery] ProjectStatus? status, [FromQuery] string? search)
        {
            var query = Db.Projects.AsNoTracking().AsQueryable();

            if (status.HasValue)
                query = query.Where(p => p.Status == status.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(p => p.Name.Contains(s));
            }

            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new ProjectListItem
                {
                    ProjectId = p.ProjectId,
                    Name = p.Name,
                    Status = p.Status,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    DepartmentName = p.Department != null ? p.Department.Name : null,
                    SkillCount = p.ProjectSkills.Count,
                    MemberCount = p.Members.Count,
                    LastMatchedAt = p.LastMatchedAt,
                    CreatedByName = p.CreatedByUser!.FirstName + " " + p.CreatedByUser.LastName,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/projects/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProjectResponse>> GetById(int id)
        {
            var response = await LoadResponseAsync(id);
            if (response == null)
                return NotFound(new { message = $"No project found with ProjectId {id}." });

            return Ok(response);
        }

        // PUT api/projects/{id}
        // Replaces the project's content. Closed projects can't be edited.
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ProjectResponse>> Update(int id, SaveProjectRequest request)
        {
            var project = await Db.Projects
                .Include(p => p.ProjectSkills)
                .FirstOrDefaultAsync(p => p.ProjectId == id);

            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {id}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "A closed project can't be edited." });

            var error = await ValidateAsync(request);
            if (error != null)
                return BadRequest(new { message = error });

            project.Name = request.Name.Trim();
            project.Description = request.Description;
            project.StartDate = request.StartDate;
            project.EndDate = request.EndDate;
            project.DepartmentId = request.DepartmentId;
            project.RequiredQualifications = request.RequiredQualifications ?? string.Empty;
            project.UpdatedAt = DateTime.UtcNow;

            // Sync skills by SkillId: remove dropped, update existing, add new
            var incoming = request.Skills.ToDictionary(s => s.SkillId);
            var existing = project.ProjectSkills.ToDictionary(ps => ps.SkillId);

            var removed = existing.Values.Where(ps => !incoming.ContainsKey(ps.SkillId)).ToList();
            Db.ProjectSkills.RemoveRange(removed);

            foreach (var skill in incoming.Values)
            {
                if (existing.TryGetValue(skill.SkillId, out var current))
                {
                    current.IsRequired = skill.IsRequired;
                    current.MinimumLevel = skill.MinimumLevel;
                }
                else
                {
                    project.ProjectSkills.Add(new ProjectSkill
                    {
                        SkillId = skill.SkillId,
                        IsRequired = skill.IsRequired,
                        MinimumLevel = skill.MinimumLevel
                    });
                }
            }

            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // PATCH api/projects/{id}/close
        // Members and history stay; a closed project no longer counts as "active" for anyone.
        [HttpPatch("{id:int}/close")]
        public async Task<ActionResult<ProjectResponse>> Close(int id)
        {
            var project = await Db.Projects.FirstOrDefaultAsync(p => p.ProjectId == id);

            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {id}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "This project is already closed." });

            project.Status = ProjectStatus.Closed;
            project.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // Returns an error message, or null if the request is valid.
        private async Task<string?> ValidateAsync(SaveProjectRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return "Project name is required.";

            if (request.StartDate.HasValue && request.EndDate.HasValue
                && request.EndDate.Value < request.StartDate.Value)
                return "EndDate can't be before StartDate.";

            if (request.Skills == null || request.Skills.Count == 0)
                return "At least one skill must be specified.";

            var skillIds = request.Skills.Select(s => s.SkillId).ToList();

            if (skillIds.Distinct().Count() != skillIds.Count)
                return "The same skill is listed more than once.";

            var found = await Db.Skills.CountAsync(s => skillIds.Contains(s.SkillId));
            if (found != skillIds.Count)
                return "One or more skills do not exist.";

            if (request.DepartmentId.HasValue &&
    !await Db.Departments.AnyAsync(d => d.DepartmentId == request.DepartmentId.Value))
                return "The selected department does not exist.";

            return null;
        }

        private async Task<ProjectResponse?> LoadResponseAsync(int id)
        {
            return await Db.Projects
                .AsNoTracking()
                .Where(p => p.ProjectId == id)
                .Select(p => new ProjectResponse
                {
                    ProjectId = p.ProjectId,
                    Name = p.Name,
                    Description = p.Description,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Status = p.Status,
                    RequiredQualifications = p.RequiredQualifications,
                    CreatedByUserId = p.CreatedByUserId,
                    CreatedByName = p.CreatedByUser!.FirstName + " " + p.CreatedByUser.LastName,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department != null ? p.Department.Name : null,
                    LastMatchedAt = p.LastMatchedAt,
                    MemberCount = p.Members.Count,
                    Skills = p.ProjectSkills
                        .OrderByDescending(ps => ps.IsRequired)
                        .ThenBy(ps => ps.Skill!.Name)
                        .Select(ps => new ProjectSkillResponse
                        {
                            SkillId = ps.SkillId,
                            SkillName = ps.Skill!.Name,
                            IsRequired = ps.IsRequired,
                            MinimumLevel = ps.MinimumLevel
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();
        }
    }
}