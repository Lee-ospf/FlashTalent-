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
        public async Task<ActionResult<List<DepartmentResponse>>> GetAllDepartments()
        {
            var departments = await Db.Departments.ToListAsync();
            var result = departments.Select(d => MapToResponse(d)).ToList();

            return Ok(result);
        }

        // GET: api/Department/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DepartmentResponse>> GetDepartmentById(int id)
        {
            var department = await Db.Departments.FindAsync(id);

            if (department is null)
                return NotFound($"Department with ID {id} not found.");

            return Ok(MapToResponse(department));
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