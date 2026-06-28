using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DepartmentController : Controller
    {
        private readonly AppDbContext _context;

        public DepartmentController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Department
        [HttpGet]
        public async Task<ActionResult<List<DepartmentResponse>>> GetAllDepartments()
        {
            var departments = await _context.Departments.ToListAsync();
            var result = departments.Select(d => MapToResponse(d)).ToList();

            return Ok(result);
        }

        // GET: api/Department/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DepartmentResponse>> GetDepartmentById(int id)
        {
            var department = await _context.Departments.FindAsync(id);

            if (department is null)
                return NotFound($"Department with ID {id} not found.");

            return Ok(MapToResponse(department));
        }

        // POST: api/Department
        [HttpPost]
        public async Task<ActionResult<DepartmentResponse>> CreateDepartment([FromBody] CreateDepartmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var alreadyExists = await _context.Departments
                .AnyAsync(d => d.Name.ToLower() == dto.Name.ToLower());

            if (alreadyExists)
                return BadRequest($"A department named '{dto.Name}' already exists.");

            var department = new Department
            {
                Name = dto.Name,
                IsActive = true
            };

            _context.Departments.Add(department);
            await _context.SaveChangesAsync();

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
