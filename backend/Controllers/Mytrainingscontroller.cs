using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Employee self-service for training. The employee is ALWAYS resolved from the logged-in
    // user - there is no employee id in these URLs, so nobody can touch another person's training.
    //
    // Lifecycle (employee side):
    //   NotStarted / InProgress --submit--> AwaitingConfirmation --withdraw--> InProgress
    // HR confirms or rejects in Step 5b.
    [ApiController]
    [Route("api/employees/me/trainings")]
    [Authorize(Roles = "Employee")]
    public class MyTrainingsController : TalentHubControllerBase
    {
        private readonly INotificationService _notificationService;

        public MyTrainingsController(AppDbContext db, INotificationService notificationService) : base(db)
        {
            _notificationService = notificationService;
        }

        private Task<Employee?> GetMyEmployeeAsync()
            => Db.Employees.Include(e => e.User).FirstOrDefaultAsync(e => e.UserId == CurrentUserId);

        private NotFoundObjectResult NoProfile()
            => NotFound(new { message = "No employee profile exists for this account." });

        private NotFoundObjectResult NoTraining(int id)
            => NotFound(new { message = $"No training found with TrainingAssignmentId {id} on your account." });

        // GET api/employees/me/trainings?status=InProgress
        // Everything assigned to me, newest first. Step 8 adds the grouped training log.
        [HttpGet]
        public async Task<ActionResult<List<MyTrainingResponse>>> GetMine([FromQuery] TrainingAssignmentStatus? status)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var today = BusinessClock.Today;
            var query = Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => a.EmployeeId == employee.EmployeeId);

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            var items = await Project(query.OrderByDescending(a => a.AssignedAt), today).ToListAsync();

            foreach (var item in items)
                Finish(item, today);

            return Ok(items);
        }

        // GET api/employees/me/trainings/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<MyTrainingResponse>> GetOne(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var response = await LoadAsync(id, employee.EmployeeId);
            if (response == null) return NoTraining(id);

            return Ok(response);
        }

        // PUT api/employees/me/trainings/{id}/progress
        // Sets progress (0-100). Anything above 0 makes the training In progress.
        [HttpPut("{id:int}/progress")]
        public async Task<ActionResult<MyTrainingResponse>> UpdateProgress(int id, UpdateTrainingProgressRequest request)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var assignment = await Db.TrainingAssignments
                .Include(a => a.Intake)
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id && a.EmployeeId == employee.EmployeeId);
            if (assignment == null) return NoTraining(id);

            var blocked = BlockedReason(assignment, "update progress on");
            if (blocked != null)
                return BadRequest(new { message = blocked });

            if (request.ProgressPercent < 0 || request.ProgressPercent > 100)
                return BadRequest(new { message = "ProgressPercent must be between 0 and 100." });

            assignment.ProgressPercent = request.ProgressPercent;

            if (request.ProgressPercent > 0 || assignment.Status == TrainingAssignmentStatus.InProgress)
            {
                assignment.Status = TrainingAssignmentStatus.InProgress;
                assignment.StartedAt ??= DateTime.UtcNow;
            }

            assignment.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok(await LoadAsync(id, employee.EmployeeId));
        }

        // POST api/employees/me/trainings/{id}/submit
        // "I'm done". Status becomes AwaitingConfirmation, progress is locked at 100,
        // and every active HR user is notified.
        [HttpPost("{id:int}/submit")]
        public async Task<ActionResult<MyTrainingResponse>> Submit(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var assignment = await Db.TrainingAssignments
                .Include(a => a.Intake).ThenInclude(i => i!.Programme)
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id && a.EmployeeId == employee.EmployeeId);
            if (assignment == null) return NoTraining(id);

            var blocked = BlockedReason(assignment, "submit");
            if (blocked != null)
                return BadRequest(new { message = blocked });

            var now = DateTime.UtcNow;
            assignment.Status = TrainingAssignmentStatus.AwaitingConfirmation;
            assignment.ProgressPercent = 100;
            assignment.StartedAt ??= now;
            assignment.SubmittedAt = now;
            assignment.UpdatedAt = now;

            // Tell every active HR user (not Admin). Missing templates give a Failed row, not an error.
            var hrUserIds = await Db.Users
                .Where(u => u.Role == UserRole.HR && u.IsActive)
                .Select(u => u.UserId)
                .ToListAsync();

            var employeeName = employee.User!.FirstName + " " + employee.User.LastName;

            foreach (var hrUserId in hrUserIds)
            {
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = hrUserId,
                    Type = NotificationType.TrainingSubmitted,
                    TemplateData = new()
                    {
                        ["EmployeeName"] = employeeName,
                        ["ProgrammeTitle"] = assignment.Intake!.Programme!.Title
                    }
                });
                Db.Notifications.AddRange(notifications);
            }

            await Db.SaveChangesAsync();

            return Ok(await LoadAsync(id, employee.EmployeeId));
        }

        // POST api/employees/me/trainings/{id}/withdraw
        // Takes a submission back before HR has decided. Returns it to In progress.
        [HttpPost("{id:int}/withdraw")]
        public async Task<ActionResult<MyTrainingResponse>> Withdraw(int id)
        {
            var employee = await GetMyEmployeeAsync();
            if (employee == null) return NoProfile();

            var assignment = await Db.TrainingAssignments
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id && a.EmployeeId == employee.EmployeeId);
            if (assignment == null) return NoTraining(id);

            if (assignment.Status != TrainingAssignmentStatus.AwaitingConfirmation)
                return BadRequest(new { message = "Only a submission that is waiting for HR can be withdrawn." });

            assignment.Status = TrainingAssignmentStatus.InProgress;
            assignment.SubmittedAt = null;
            assignment.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            return Ok(await LoadAsync(id, employee.EmployeeId));
        }

        // Returns why the employee can't change progress or submit right now, or null if they can.
        // Not based on the intake's end date: an overdue training can still be finished, and
        // HR decides what happens to it. Only the status and the intake's start date matter.
        private static string? BlockedReason(TrainingAssignment assignment, string action)
        {
            switch (assignment.Status)
            {
                case TrainingAssignmentStatus.AwaitingConfirmation:
                    return $"You can't {action} this training while HR is reviewing your submission. Withdraw it first to make changes.";
                case TrainingAssignmentStatus.Completed:
                    return "This training is already completed.";
                case TrainingAssignmentStatus.NotCompleted:
                    return "This training was marked as not completed. Please contact HR.";
            }

            var start = assignment.Intake!.StartDate.Date;
            if (start > BusinessClock.Today)
                return $"This training hasn't started yet. It starts on {start:d MMM yyyy}.";

            return null;
        }

        private async Task<MyTrainingResponse?> LoadAsync(int id, int employeeId)
        {
            var today = BusinessClock.Today;

            var item = await Project(
                    Db.TrainingAssignments.AsNoTracking()
                        .Where(a => a.TrainingAssignmentId == id && a.EmployeeId == employeeId),
                    today)
                .FirstOrDefaultAsync();

            if (item != null)
                Finish(item, today);

            return item;
        }

        private static IQueryable<MyTrainingResponse> Project(IQueryable<TrainingAssignment> query, DateTime today)
            => query.Select(a => new MyTrainingResponse
            {
                TrainingAssignmentId = a.TrainingAssignmentId,
                TrainingProgrammeId = a.Intake!.TrainingProgrammeId,
                ProgrammeTitle = a.Intake.Programme!.Title,
                Provider = a.Intake.Programme.Provider,
                Category = a.Intake.Programme.Category,
                DurationHours = a.Intake.Programme.DurationHours,
                Url = a.Intake.Programme.Url,
                TrainingIntakeId = a.TrainingIntakeId,
                IntakeName = a.Intake.Name,
                IntakeStartDate = a.Intake.StartDate,
                IntakeEndDate = a.Intake.EndDate,
                IntakeClosedAt = a.Intake.ClosedAt,
                Status = a.Status,
                ProgressPercent = a.ProgressPercent,
                DueDate = a.DueDate,
                IsOverdue = a.DueDate < today
                    && (a.Status == TrainingAssignmentStatus.NotStarted
                        || a.Status == TrainingAssignmentStatus.InProgress),
                AssignedAt = a.AssignedAt,
                StartedAt = a.StartedAt,
                SubmittedAt = a.SubmittedAt,
                ConfirmedAt = a.ConfirmedAt,
                RejectedAt = a.RejectedAt,
                RejectionReason = a.RejectionReason
            });

        // Fills the values that can't be calculated inside the database query
        private static void Finish(MyTrainingResponse item, DateTime today)
        {
            item.IntakeState = TrainingIntakeRules.GetState(
                item.IntakeClosedAt, item.IntakeStartDate, item.IntakeEndDate, today);

            var unfinished = item.Status == TrainingAssignmentStatus.NotStarted
                || item.Status == TrainingAssignmentStatus.InProgress;
            var started = item.IntakeStartDate.Date <= today;

            item.CanUpdateProgress = unfinished && started;
            item.CanSubmit = unfinished && started;
            item.CanWithdraw = item.Status == TrainingAssignmentStatus.AwaitingConfirmation;
        }
    }
}