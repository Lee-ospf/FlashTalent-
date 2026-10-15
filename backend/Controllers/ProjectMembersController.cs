using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/members")]
    [Authorize(Roles = "HR,Admin")]
    public class ProjectMembersController : TalentHubControllerBase
    {
        private readonly INotificationService _notificationService;

        public ProjectMembersController(AppDbContext db, INotificationService notificationService) : base(db)
        {
            _notificationService = notificationService;
        }

        // GET api/projects/{projectId}/members
        [HttpGet]
        public async Task<ActionResult<List<ProjectMemberResponse>>> GetAll(int projectId)
        {
            if (!await Db.Projects.AnyAsync(p => p.ProjectId == projectId))
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            var members = await Db.ProjectMembers
                .AsNoTracking()
                .Where(m => m.ProjectId == projectId)
                .OrderBy(m => m.AddedAt)
                .Select(m => new ProjectMemberResponse
                {
                    ProjectMemberId = m.ProjectMemberId,
                    EmployeeId = m.EmployeeId,
                    FullName = m.Employee!.User!.FirstName + " " + m.Employee.User.LastName,
                    JobTitle = m.Employee.JobTitle,
                    DepartmentName = m.Employee.Department != null ? m.Employee.Department.Name : null,
                    AddedByName = m.AddedByUser!.FirstName + " " + m.AddedByUser.LastName,
                    AddedAt = m.AddedAt
                })
                .ToListAsync();

            return Ok(members);
        }

        // POST api/projects/{projectId}/members
        [HttpPost]
        public async Task<ActionResult<ProjectMemberResponse>> Add(int projectId, AddProjectMemberRequest request)
        {
            var project = await Db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId);
            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "Members can't be added to a closed project." });

            var employee = await Db.Employees
                .Include(e => e.User)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.EmployeeId == request.EmployeeId);

            if (employee == null || employee.User == null)
                return NotFound(new { message = $"No employee found with EmployeeId {request.EmployeeId}." });

            if (employee.Status != "Active")
                return BadRequest(new { message = "Only active employees can be added to a project." });

            if (await Db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.EmployeeId == request.EmployeeId))
                return Conflict(new { message = "This employee is already on the project." });

            var member = new ProjectMember
            {
                ProjectId = projectId,
                EmployeeId = employee.EmployeeId,
                AddedByUserId = CurrentUserId,
                AddedAt = DateTime.UtcNow
            };
            Db.ProjectMembers.Add(member);

            // Adding overrides an earlier dismissal so the two states never disagree
            var match = await Db.ProjectMatches
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.EmployeeId == employee.EmployeeId);
            if (match != null && match.IsDismissed)
            {
                match.IsDismissed = false;
                match.DismissedByUserId = null;
                match.DismissedAt = null;
            }

            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = employee.UserId,
                Type = NotificationType.AddedToProject,
                TemplateData = new() { ["ProjectName"] = project.Name }
            });
            Db.Notifications.AddRange(notifications);

            try
            {
                await Db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // The unique (ProjectId, EmployeeId) index caught a simultaneous add
                return Conflict(new { message = "This employee is already on the project." });
            }

            var adder = await Db.Users.AsNoTracking().FirstAsync(u => u.UserId == CurrentUserId);

            return Ok(new ProjectMemberResponse
            {
                ProjectMemberId = member.ProjectMemberId,
                EmployeeId = employee.EmployeeId,
                FullName = $"{employee.User.FirstName} {employee.User.LastName}",
                JobTitle = employee.JobTitle,
                DepartmentName = employee.Department?.Name,
                AddedByName = $"{adder.FirstName} {adder.LastName}",
                AddedAt = member.AddedAt
            });
        }

        // DELETE api/projects/{projectId}/members/{employeeId}
        [HttpDelete("{employeeId:int}")]
        public async Task<IActionResult> Remove(int projectId, int employeeId)
        {
            var project = await Db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.ProjectId == projectId);
            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "A closed project's members can't be changed." });

            var member = await Db.ProjectMembers
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.EmployeeId == employeeId);
            if (member == null)
                return NotFound(new { message = "This employee is not on the project." });

            Db.ProjectMembers.Remove(member);
            await Db.SaveChangesAsync();
            return NoContent();
        }
    }
}