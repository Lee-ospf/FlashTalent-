using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // HR and Admin manage the training catalogue. Shared pool: any HR user can see and edit any programme.
    // A programme is permanent and never tied to dates; dates belong to its intakes.
    [ApiController]
    [Route("api/training-programmes")]
    [Authorize(Roles = "HR,Admin")]
    public class TrainingProgrammesController : TalentHubControllerBase
    {
        public TrainingProgrammesController(AppDbContext db) : base(db) { }

        // POST api/training-programmes
        [HttpPost]
        public async Task<ActionResult<TrainingProgrammeResponse>> Create(SaveTrainingProgrammeRequest request)
        {
            var error = await ValidateAsync(request, null);
            if (error != null)
                return BadRequest(new { message = error });

            var programme = new TrainingProgramme
            {
                Title = request.Title.Trim(),
                Description = Clean(request.Description),
                Provider = Clean(request.Provider),
                Category = Clean(request.Category),
                DurationHours = request.DurationHours,
                Url = Clean(request.Url),
                IsActive = true,
                CreatedByUserId = CurrentUserId,
                Skills = (request.SkillIds ?? new List<int>())
                    .Select(id => new TrainingProgrammeSkill { SkillId = id })
                    .ToList()
            };

            Db.TrainingProgrammes.Add(programme);
            await Db.SaveChangesAsync();

            var response = await LoadResponseAsync(programme.TrainingProgrammeId);
            return CreatedAtAction(nameof(GetById), new { id = programme.TrainingProgrammeId }, response);
        }

        // GET api/training-programmes?isActive=true&category=...&search=...
        [HttpGet]
        public async Task<ActionResult<List<TrainingProgrammeListItem>>> GetAll(
            [FromQuery] bool? isActive, [FromQuery] string? category, [FromQuery] string? search)
        {
            var today = BusinessClock.Today;
            var query = Db.TrainingProgrammes.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(p => p.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(category))
            {
                var c = category.Trim();
                query = query.Where(p => p.Category == c);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(p => p.Title.Contains(s) || (p.Provider != null && p.Provider.Contains(s)));
            }

            var items = await query
                .OrderBy(p => p.Title)
                .Select(p => new TrainingProgrammeListItem
                {
                    TrainingProgrammeId = p.TrainingProgrammeId,
                    Title = p.Title,
                    Provider = p.Provider,
                    Category = p.Category,
                    DurationHours = p.DurationHours,
                    IsActive = p.IsActive,
                    SkillCount = p.Skills.Count,
                    IntakeCount = p.Intakes.Count,
                    OpenIntakeCount = p.Intakes.Count(i => i.ClosedAt == null && i.EndDate >= today),
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/training-programmes/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TrainingProgrammeResponse>> GetById(int id)
        {
            var response = await LoadResponseAsync(id);
            if (response == null)
                return NotFound(new { message = $"No training programme found with TrainingProgrammeId {id}." });

            return Ok(response);
        }

        // PUT api/training-programmes/{id}
        // Replaces the programme's content. Retired programmes can't be edited.
        [HttpPut("{id:int}")]
        public async Task<ActionResult<TrainingProgrammeResponse>> Update(int id, SaveTrainingProgrammeRequest request)
        {
            var programme = await Db.TrainingProgrammes
                .Include(p => p.Skills)
                .FirstOrDefaultAsync(p => p.TrainingProgrammeId == id);

            if (programme == null)
                return NotFound(new { message = $"No training programme found with TrainingProgrammeId {id}." });

            if (!programme.IsActive)
                return BadRequest(new { message = "A retired programme can't be edited. Reactivate it first." });

            var error = await ValidateAsync(request, id);
            if (error != null)
                return BadRequest(new { message = error });

            programme.Title = request.Title.Trim();
            programme.Description = Clean(request.Description);
            programme.Provider = Clean(request.Provider);
            programme.Category = Clean(request.Category);
            programme.DurationHours = request.DurationHours;
            programme.Url = Clean(request.Url);
            programme.UpdatedAt = DateTime.UtcNow;

            // Sync skills by SkillId: remove dropped, add new
            var incoming = (request.SkillIds ?? new List<int>()).ToHashSet();
            var existing = programme.Skills.ToDictionary(ps => ps.SkillId);

            var removed = existing.Values.Where(ps => !incoming.Contains(ps.SkillId)).ToList();
            Db.TrainingProgrammeSkills.RemoveRange(removed);

            foreach (var skillId in incoming.Where(s => !existing.ContainsKey(s)))
                programme.Skills.Add(new TrainingProgrammeSkill { SkillId = skillId });

            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // PATCH api/training-programmes/{id}/retire
        // Blocked while any intake is upcoming or running. History stays untouched.
        [HttpPatch("{id:int}/retire")]
        public async Task<ActionResult<TrainingProgrammeResponse>> Retire(int id)
        {
            var programme = await Db.TrainingProgrammes.FirstOrDefaultAsync(p => p.TrainingProgrammeId == id);

            if (programme == null)
                return NotFound(new { message = $"No training programme found with TrainingProgrammeId {id}." });

            if (!programme.IsActive)
                return BadRequest(new { message = "This programme is already retired." });

            var today = BusinessClock.Today;
            var openIntakes = await Db.TrainingIntakes.CountAsync(i =>
                i.TrainingProgrammeId == id && i.ClosedAt == null && i.EndDate >= today);

            if (openIntakes > 0)
                return BadRequest(new
                {
                    message = $"This programme has {openIntakes} intake(s) that are upcoming or running. " +
                              "Close or finish them before retiring the programme."
                });

            programme.IsActive = false;
            programme.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // PATCH api/training-programmes/{id}/reactivate
        [HttpPatch("{id:int}/reactivate")]
        public async Task<ActionResult<TrainingProgrammeResponse>> Reactivate(int id)
        {
            var programme = await Db.TrainingProgrammes.FirstOrDefaultAsync(p => p.TrainingProgrammeId == id);

            if (programme == null)
                return NotFound(new { message = $"No training programme found with TrainingProgrammeId {id}." });

            if (programme.IsActive)
                return BadRequest(new { message = "This programme is already active." });

            programme.IsActive = true;
            programme.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // Returns an error message, or null if the request is valid.
        // excludeId = the programme being edited, so it doesn't clash with its own title.
        private async Task<string?> ValidateAsync(SaveTrainingProgrammeRequest request, int? excludeId)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return "Title is required.";

            var title = request.Title.Trim();
            if (title.Length > 200)
                return "Title can't be longer than 200 characters.";

            if (request.Description != null && request.Description.Length > 2000)
                return "Description can't be longer than 2000 characters.";

            if (request.Provider != null && request.Provider.Length > 200)
                return "Provider can't be longer than 200 characters.";

            if (request.Category != null && request.Category.Length > 100)
                return "Category can't be longer than 100 characters.";

            if (request.DurationHours.HasValue && (request.DurationHours.Value <= 0 || request.DurationHours.Value > 9999))
                return "DurationHours must be greater than 0 and no more than 9999.";

            if (!string.IsNullOrWhiteSpace(request.Url))
            {
                var url = request.Url.Trim();
                if (url.Length > 500)
                    return "Url can't be longer than 500 characters.";

                if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
                    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                    return "Url must be a valid http or https link.";
            }

            var duplicate = await Db.TrainingProgrammes.AnyAsync(p =>
                p.Title == title && (excludeId == null || p.TrainingProgrammeId != excludeId.Value));
            if (duplicate)
                return "A training programme with this title already exists.";

            var skillIds = request.SkillIds ?? new List<int>();

            if (skillIds.Distinct().Count() != skillIds.Count)
                return "The same skill is listed more than once.";

            if (skillIds.Count > 0)
            {
                var found = await Db.Skills.CountAsync(s => skillIds.Contains(s.SkillId));
                if (found != skillIds.Count)
                    return "One or more skills do not exist.";
            }

            return null;
        }

        // Empty or whitespace-only text is stored as null
        private static string? Clean(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private async Task<TrainingProgrammeResponse?> LoadResponseAsync(int id)
        {
            var today = BusinessClock.Today;

            return await Db.TrainingProgrammes
                .AsNoTracking()
                .Where(p => p.TrainingProgrammeId == id)
                .Select(p => new TrainingProgrammeResponse
                {
                    TrainingProgrammeId = p.TrainingProgrammeId,
                    Title = p.Title,
                    Description = p.Description,
                    Provider = p.Provider,
                    Category = p.Category,
                    DurationHours = p.DurationHours,
                    Url = p.Url,
                    IsActive = p.IsActive,
                    CreatedByUserId = p.CreatedByUserId,
                    CreatedByName = p.CreatedByUser!.FirstName + " " + p.CreatedByUser.LastName,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    IntakeCount = p.Intakes.Count,
                    OpenIntakeCount = p.Intakes.Count(i => i.ClosedAt == null && i.EndDate >= today),
                    Skills = p.Skills
                        .OrderBy(ps => ps.Skill!.Name)
                        .Select(ps => new TrainingProgrammeSkillResponse
                        {
                            SkillId = ps.SkillId,
                            SkillName = ps.Skill!.Name
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();
        }
    }
}