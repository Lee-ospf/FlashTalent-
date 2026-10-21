using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // HR and Admin manage intakes: one run of a programme, with its own dates.
    // State (Upcoming / Running / Ended) is calculated from the dates, never stored.
    [ApiController]
    [Route("api/training-intakes")]
    [Authorize(Roles = "HR,Admin")]
    public class TrainingIntakesController : TalentHubControllerBase
    {
        public TrainingIntakesController(AppDbContext db) : base(db) { }

        // POST api/training-intakes
        [HttpPost]
        public async Task<ActionResult<TrainingIntakeResponse>> Create(CreateTrainingIntakeRequest request)
        {
            var programme = await Db.TrainingProgrammes
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TrainingProgrammeId == request.TrainingProgrammeId);

            if (programme == null)
                return BadRequest(new { message = "The selected programme does not exist." });

            if (!programme.IsActive)
                return BadRequest(new { message = "This programme is retired. Reactivate it before creating an intake." });

            var error = await ValidateAsync(request, programme.TrainingProgrammeId, null, 0);
            if (error != null)
                return BadRequest(new { message = error });

            var intake = new TrainingIntake
            {
                TrainingProgrammeId = programme.TrainingProgrammeId,
                Name = request.Name.Trim(),
                StartDate = request.StartDate!.Value.Date,
                EndDate = request.EndDate!.Value.Date,
                MaxParticipants = request.MaxParticipants,
                CreatedByUserId = CurrentUserId
            };

            Db.TrainingIntakes.Add(intake);
            await Db.SaveChangesAsync();

            var response = await LoadResponseAsync(intake.TrainingIntakeId);
            return CreatedAtAction(nameof(GetById), new { id = intake.TrainingIntakeId }, response);
        }

        // GET api/training-intakes?programmeId=1&state=Running
        [HttpGet]
        public async Task<ActionResult<List<TrainingIntakeListItem>>> GetAll(
            [FromQuery] int? programmeId, [FromQuery] TrainingIntakeState? state)
        {
            var today = BusinessClock.Today;
            var query = Db.TrainingIntakes.AsNoTracking().AsQueryable();

            if (programmeId.HasValue)
                query = query.Where(i => i.TrainingProgrammeId == programmeId.Value);

            if (state.HasValue)
            {
                query = state.Value switch
                {
                    TrainingIntakeState.Upcoming =>
                        query.Where(i => i.ClosedAt == null && i.StartDate > today),
                    TrainingIntakeState.Running =>
                        query.Where(i => i.ClosedAt == null && i.StartDate <= today && i.EndDate >= today),
                    _ =>
                        query.Where(i => i.ClosedAt != null || i.EndDate < today)
                };
            }

            var items = await query
                .OrderByDescending(i => i.StartDate)
                .Select(i => new TrainingIntakeListItem
                {
                    TrainingIntakeId = i.TrainingIntakeId,
                    TrainingProgrammeId = i.TrainingProgrammeId,
                    ProgrammeTitle = i.Programme!.Title,
                    Name = i.Name,
                    StartDate = i.StartDate,
                    EndDate = i.EndDate,
                    MaxParticipants = i.MaxParticipants,
                    AssignmentCount = i.Assignments.Count,
                    CompletedCount = i.Assignments.Count(a => a.Status == TrainingAssignmentStatus.Completed),
                    ClosedAt = i.ClosedAt
                })
                .ToListAsync();

            foreach (var item in items)
                item.State = TrainingIntakeRules.GetState(item.ClosedAt, item.StartDate, item.EndDate, today);

            return Ok(items);
        }

        // GET api/training-intakes/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TrainingIntakeResponse>> GetById(int id)
        {
            var response = await LoadResponseAsync(id);
            if (response == null)
                return NotFound(new { message = $"No intake found with TrainingIntakeId {id}." });

            return Ok(response);
        }

        // PUT api/training-intakes/{id}
        // Ended intakes can't be edited. Once anyone is assigned the start date is locked.
        // Changing the end date moves the due date of everyone still following the old end date.
        [HttpPut("{id:int}")]
        public async Task<ActionResult<TrainingIntakeResponse>> Update(int id, SaveTrainingIntakeRequest request)
        {
            var intake = await Db.TrainingIntakes.FirstOrDefaultAsync(i => i.TrainingIntakeId == id);

            if (intake == null)
                return NotFound(new { message = $"No intake found with TrainingIntakeId {id}." });

            var today = BusinessClock.Today;
            if (TrainingIntakeRules.GetState(intake.ClosedAt, intake.StartDate, intake.EndDate, today) == TrainingIntakeState.Ended)
                return BadRequest(new { message = "An ended intake can't be edited." });

            var assignmentCount = await Db.TrainingAssignments.CountAsync(a => a.TrainingIntakeId == id);

            var error = await ValidateAsync(request, intake.TrainingProgrammeId, intake, assignmentCount);
            if (error != null)
                return BadRequest(new { message = error });

            var oldEnd = intake.EndDate.Date;
            var newEnd = request.EndDate!.Value.Date;

            intake.Name = request.Name.Trim();
            intake.StartDate = request.StartDate!.Value.Date;
            intake.EndDate = newEnd;
            intake.MaxParticipants = request.MaxParticipants;

            // People whose due date still equals the old end date were following the default,
            // so they follow the new one. Individual overrides are left alone.
            if (newEnd != oldEnd)
            {
                var followers = await Db.TrainingAssignments
                    .Where(a => a.TrainingIntakeId == id
                        && a.DueDate == oldEnd
                        && (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress
                            || a.Status == TrainingAssignmentStatus.AwaitingConfirmation))
                    .ToListAsync();

                foreach (var assignment in followers)
                {
                    assignment.DueDate = newEnd;
                    assignment.UpdatedAt = DateTime.UtcNow;
                }
            }

            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // PATCH api/training-intakes/{id}/close
        // Closes the intake before its end date. It then counts as Ended: no new people,
        // and HR decides what happens to each unfinished assignment.
        [HttpPatch("{id:int}/close")]
        public async Task<ActionResult<TrainingIntakeResponse>> Close(int id)
        {
            var intake = await Db.TrainingIntakes.FirstOrDefaultAsync(i => i.TrainingIntakeId == id);

            if (intake == null)
                return NotFound(new { message = $"No intake found with TrainingIntakeId {id}." });

            var today = BusinessClock.Today;
            if (TrainingIntakeRules.GetState(intake.ClosedAt, intake.StartDate, intake.EndDate, today) == TrainingIntakeState.Ended)
                return BadRequest(new { message = "This intake has already ended." });

            intake.ClosedAt = DateTime.UtcNow;
            intake.ClosedByUserId = CurrentUserId;
            await Db.SaveChangesAsync();

            return Ok(await LoadResponseAsync(id));
        }

        // Returns an error message, or null if the request is valid.
        // current = the intake being edited (null on create).
        private async Task<string?> ValidateAsync(
            SaveTrainingIntakeRequest request, int programmeId, TrainingIntake? current, int assignmentCount)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return "Name is required.";

            var name = request.Name.Trim();
            if (name.Length > 200)
                return "Name can't be longer than 200 characters.";

            if (!request.StartDate.HasValue)
                return "StartDate is required.";

            if (!request.EndDate.HasValue)
                return "EndDate is required.";

            var today = BusinessClock.Today;
            var start = request.StartDate.Value.Date;
            var end = request.EndDate.Value.Date;

            if (end < start)
                return "EndDate can't be before StartDate.";

            var startChanged = current == null || start != current.StartDate.Date;
            var endChanged = current == null || end != current.EndDate.Date;

            if (startChanged && start < today)
                return "StartDate can't be in the past.";

            if (startChanged && current != null && assignmentCount > 0)
                return "The start date can't be changed once employees are assigned.";

            if (endChanged && end < today)
                return "EndDate can't be in the past.";

            if (request.MaxParticipants.HasValue)
            {
                if (request.MaxParticipants.Value < 1)
                    return "MaxParticipants must be at least 1, or left empty for no limit.";

                if (request.MaxParticipants.Value < assignmentCount)
                    return $"MaxParticipants can't be lower than the {assignmentCount} employee(s) already assigned.";
            }

            var currentId = current?.TrainingIntakeId;
            var duplicate = await Db.TrainingIntakes.AnyAsync(i =>
                i.TrainingProgrammeId == programmeId
                && i.Name == name
                && (currentId == null || i.TrainingIntakeId != currentId.Value));
            if (duplicate)
                return "This programme already has an intake with this name.";

            return null;
        }

        private async Task<TrainingIntakeResponse?> LoadResponseAsync(int id)
        {
            var today = BusinessClock.Today;

            var row = await Db.TrainingIntakes
                .AsNoTracking()
                .Where(i => i.TrainingIntakeId == id)
                .Select(i => new
                {
                    Response = new TrainingIntakeResponse
                    {
                        TrainingIntakeId = i.TrainingIntakeId,
                        TrainingProgrammeId = i.TrainingProgrammeId,
                        ProgrammeTitle = i.Programme!.Title,
                        Name = i.Name,
                        StartDate = i.StartDate,
                        EndDate = i.EndDate,
                        MaxParticipants = i.MaxParticipants,
                        AssignmentCount = i.Assignments.Count,
                        CompletedCount = i.Assignments.Count(a => a.Status == TrainingAssignmentStatus.Completed),
                        AwaitingConfirmationCount = i.Assignments.Count(a => a.Status == TrainingAssignmentStatus.AwaitingConfirmation),
                        ClosedAt = i.ClosedAt,
                        ClosedByName = i.ClosedByUser != null
                            ? i.ClosedByUser.FirstName + " " + i.ClosedByUser.LastName
                            : null,
                        CreatedByUserId = i.CreatedByUserId,
                        CreatedByName = i.CreatedByUser!.FirstName + " " + i.CreatedByUser.LastName,
                        CreatedAt = i.CreatedAt
                    }
                })
                .FirstOrDefaultAsync();

            if (row == null)
                return null;

            var response = row.Response;
            response.State = TrainingIntakeRules.GetState(response.ClosedAt, response.StartDate, response.EndDate, today);
            response.SpotsLeft = response.MaxParticipants.HasValue
                ? Math.Max(0, response.MaxParticipants.Value - response.AssignmentCount)
                : null;

            return response;
        }
    }
}