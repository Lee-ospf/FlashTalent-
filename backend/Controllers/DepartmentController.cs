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
    [Authorize(Roles = "Recruiter,Admin")]
    public class DepartmentController : TalentHubControllerBase
    {
        public DepartmentController(AppDbContext db) : base(db)
        {
        }

            // GET: api/Department
            // Recruiter/Admin - needed when creating an internal vacancy.
            [HttpGet]
            public async Task<ActionResult<List<DepartmentResponse>>> GetAll()
            {
                var departments = await Db.Departments
                    .OrderBy(d => d.Name)
                    .Select(d => new DepartmentResponse
                    {
                        DepartmentId = d.DepartmentId,
                        Name = d.Name,
                        IsActive = d.IsActive,
                        HeadCount = d.Employees.Count(e => e.Status == "Active")
                    })
                    .ToListAsync();

                return Ok(departments);
            }
        // GET: api/Department/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DepartmentResponse>> GetDepartmentById(int id)
        {
            var department = await Db.Departments
                .Where(d => d.DepartmentId == id)
                .Select(d => new DepartmentResponse
                {
                    DepartmentId = d.DepartmentId,
                    Name = d.Name,
                    IsActive = d.IsActive,
                    HeadCount = d.Employees.Count(e => e.Status == "Active")
                })
                .FirstOrDefaultAsync();

            if (department is null)
                return NotFound($"Department with ID {id} not found.");

            return Ok(department);
        }
        // POST: api/Department
        // Admin only - managing the department list.
        [Authorize(Roles = "Admin")]
            [HttpPost]
            public async Task<ActionResult<DepartmentResponse>> CreateDepartment([FromBody] CreateDepartmentDto dto)
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var alreadyExists = await Db.Departments
                    .AnyAsync(d => d.Name.ToLower() == dto.Name.ToLower());

                if (alreadyExists)
                    return BadRequest($"A department named '{dto.Name}' already exists.");

                var department = new Department
                {
                    Name = dto.Name,
                    IsActive = true
                };

                Db.Departments.Add(department);
                await Db.SaveChangesAsync();

                return Ok(MapToResponse(department));
            }

        // GET: api/Department/1/employees
        // GET: api/Department/1/employees?status=OnLeave   (status=all returns everyone)
        [Authorize(Roles = "HR,Admin")]
        [HttpGet("{id:int}/employees")]
        public async Task<ActionResult<List<EmployeeListItem>>> GetEmployees(
            int id, [FromQuery] string? status = "Active")
        {
            var departmentExists = await Db.Departments.AnyAsync(d => d.DepartmentId == id);
            if (!departmentExists)
                return NotFound($"Department with ID {id} not found.");

            var query = Db.Employees.Where(e => e.DepartmentId == id);

            if (!string.IsNullOrWhiteSpace(status) &&
                !status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(e => e.Status == status);
            }

            var employees = await query
                .OrderBy(e => e.User!.LastName)
                .ThenBy(e => e.User!.FirstName)
                .Select(e => new EmployeeListItem
                {
                    EmployeeId = e.EmployeeId,
                    FirstName = e.User!.FirstName,
                    LastName = e.User.LastName,
                    Email = e.User.Email,
                    JobTitle = e.JobTitle,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department!.Name,
                    HireDate = e.HireDate,
                    Status = e.Status
                })
                .ToListAsync();

            return Ok(employees);
        }

        private static DepartmentResponse MapToResponse(Department d)
        {
            return new DepartmentResponse
            {
                DepartmentId = d.DepartmentId,
                Name = d.Name,
                IsActive = d.IsActive
            };
        }
    }
}
