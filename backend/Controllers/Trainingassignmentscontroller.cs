using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Everything HR does with assignments (the employee side is MyTrainingsController):
    //   Assigning     POST  training-intakes/{intakeId}/assignments, GET the same path, PATCH due date
    //   Reviewing     AwaitingConfirmation --confirm--> Completed, or --reject (reason required)--> InProgress
    //   Resolving     when an intake ends: extend the due date, move to the next intake, or mark Not completed
    // Confirming a training does NOT change the employee's profile qualifications.
    // Nothing is deleted: moved and not-completed assignments stay as history.
    [ApiController]
    [Route("api")]
    [Authorize(Roles = "HR,Admin")]
    public class TrainingAssignmentsController : TalentHubControllerBase
    {
        private const int MaxEmployeesPerRequest = 200;
        private const int MaxReasonLength = 1000;

        private readonly INotificationService _notificationService;

        public TrainingAssignmentsController(AppDbContext db, INotificationService notificationService) : base(db)
        {
            _notificationService = notificationService;
        }

        // ================= Assigning =================

        // POST api/training-intakes/{intakeId}/assignments
        // Assigns several employees at once. Employees who can't be added are reported
        // with a reason; the rest are still added.
        [HttpPost("training-intakes/{intakeId:int}/assignments")]
        public async Task<ActionResult<AssignEmployeesResponse>> Assign(int intakeId, AssignEmployeesRequest request)
        {
            var intake = await Db.TrainingIntakes
                .Include(i => i.Programme)
                .FirstOrDefaultAsync(i => i.TrainingIntakeId == intakeId);

            if (intake == null)
                return NotFound(new { message = $"No intake found with TrainingIntakeId {intakeId}." });

            var today = BusinessClock.Today;

            if (TrainingIntakeRules.GetState(intake.ClosedAt, intake.StartDate, intake.EndDate, today) == TrainingIntakeState.Ended)
                return BadRequest(new { message = "This intake has ended and can't take new people." });

            var employeeIds = (request.EmployeeIds ?? new List<int>()).Distinct().ToList();

            if (employeeIds.Count == 0)
                return BadRequest(new { message = "At least one employee must be selected." });

            if (employeeIds.Count > MaxEmployeesPerRequest)
                return BadRequest(new { message = $"You can assign at most {MaxEmployeesPerRequest} employees at once." });

            DateTime dueDate = intake.EndDate.Date;
            if (request.DueDate.HasValue)
            {
                dueDate = request.DueDate.Value.Date;
                if (dueDate < today)
                    return BadRequest(new { message = "DueDate can't be in the past." });
            }

            var employees = await Db.Employees
                .Include(e => e.User)
                .Where(e => employeeIds.Contains(e.EmployeeId))
                .ToDictionaryAsync(e => e.EmployeeId);

            // Already in this intake
            var alreadyInThisIntake = await Db.TrainingAssignments
                .Where(a => a.TrainingIntakeId == intakeId && employeeIds.Contains(a.EmployeeId))
                .Select(a => a.EmployeeId)
                .ToListAsync();

            // Unfinished training of the same programme in another intake. HR must resolve it first
            // (extend, move to the next intake, or mark Not completed). Completed and Not completed
            // assignments don't block, so retaking is allowed.
            var unfinishedElsewhere = await Db.TrainingAssignments
                .Where(a => employeeIds.Contains(a.EmployeeId)
                    && a.TrainingIntakeId != intakeId
                    && a.Intake!.TrainingProgrammeId == intake.TrainingProgrammeId
                    && (a.Status == TrainingAssignmentStatus.NotStarted
                        || a.Status == TrainingAssignmentStatus.InProgress
                        || a.Status == TrainingAssignmentStatus.AwaitingConfirmation))
                .Select(a => new { a.EmployeeId, IntakeName = a.Intake!.Name })
                .ToListAsync();
            var unfinishedByEmployee = unfinishedElsewhere
                .GroupBy(x => x.EmployeeId)
                .ToDictionary(g => g.Key, g => g.First().IntakeName);

            var currentCount = await Db.TrainingAssignments.CountAsync(a => a.TrainingIntakeId == intakeId);
            var spotsLeft = intake.MaxParticipants.HasValue
                ? Math.Max(0, intake.MaxParticipants.Value - currentCount)
                : int.MaxValue;

            var response = new AssignEmployeesResponse();
            var created = new List<(TrainingAssignment Assignment, Employee Employee)>();

            foreach (var employeeId in employeeIds)
            {
                if (!employees.TryGetValue(employeeId, out var employee))
                {
                    response.Skipped.Add(new SkippedEmployeeResponse
                    {
                        EmployeeId = employeeId,
                        Reason = "Employee not found."
                    });
                    continue;
                }

                var name = employee.User!.FirstName + " " + employee.User.LastName;

                string? reason = null;

                if (employee.Status != "Active" || !employee.User.IsActive)
                    reason = "Employee is not active.";
                else if (alreadyInThisIntake.Contains(employeeId))
                    reason = "Already in this intake.";
                else if (unfinishedByEmployee.TryGetValue(employeeId, out var otherIntake))
                    reason = $"Has unfinished training of this programme in \"{otherIntake}\". Resolve that first.";
                else if (spotsLeft <= 0)
                    reason = "The intake is full.";

                if (reason != null)
                {
                    response.Skipped.Add(new SkippedEmployeeResponse
                    {
                        EmployeeId = employeeId,
                        EmployeeName = name,
                        Reason = reason
                    });
                    continue;
                }

                var assignment = new TrainingAssignment
                {
                    TrainingIntakeId = intakeId,
                    EmployeeId = employeeId,
                    Status = TrainingAssignmentStatus.NotStarted,
                    ProgressPercent = 0,
                    DueDate = dueDate,
                    AssignedByUserId = CurrentUserId
                };

                Db.TrainingAssignments.Add(assignment);
                created.Add((assignment, employee));

                // Respects the employee's preference: "None" gives a Skipped row, no preference gives Both.
                // A missing template gives a Failed row rather than an error, so the assignment still goes through.
                var notifications = await _notificationService.Build(new NotificationRequest
                {
                    UserId = employee.UserId,
                    Type = NotificationType.TrainingAssigned,
                    TemplateData = new()
                    {
                        ["ProgrammeTitle"] = intake.Programme!.Title,
                        ["IntakeName"] = intake.Name,
                        ["StartDate"] = FormatDate(intake.StartDate),
                        ["DueDate"] = FormatDate(dueDate)
                    }
                });
                Db.Notifications.AddRange(notifications);

                if (spotsLeft != int.MaxValue)
                    spotsLeft--;
            }

            if (created.Count > 0)
            {
                try
                {
                    await Db.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    // The unique (intake, employee) index caught a simultaneous assignment
                    return Conflict(new { message = "Someone else just changed this intake. Please reload and try again." });
                }
            }

            foreach (var (assignment, employee) in created)
            {
                response.Added.Add(new AssignedEmployeeResponse
                {
                    EmployeeId = employee.EmployeeId,
                    EmployeeName = employee.User!.FirstName + " " + employee.User.LastName,
                    TrainingAssignmentId = assignment.TrainingAssignmentId,
                    DueDate = assignment.DueDate
                });
            }

            return Ok(response);
        }

        // GET api/training-intakes/{intakeId}/assignments?status=InProgress
        [HttpGet("training-intakes/{intakeId:int}/assignments")]
        public async Task<ActionResult<List<TrainingAssignmentListItem>>> GetForIntake(
            int intakeId, [FromQuery] TrainingAssignmentStatus? status)
        {
            if (!await Db.TrainingIntakes.AnyAsync(i => i.TrainingIntakeId == intakeId))
                return NotFound(new { message = $"No intake found with TrainingIntakeId {intakeId}." });

            var today = BusinessClock.Today;
            var query = Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => a.TrainingIntakeId == intakeId);

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            var items = await query
                .OrderBy(a => a.Employee!.User!.FirstName)
                .ThenBy(a => a.Employee!.User!.LastName)
                .Select(a => new TrainingAssignmentListItem
                {
                    TrainingAssignmentId = a.TrainingAssignmentId,
                    TrainingIntakeId = a.TrainingIntakeId,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.User!.FirstName + " " + a.Employee.User.LastName,
                    JobTitle = a.Employee.JobTitle,
                    DepartmentName = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    Status = a.Status,
                    ProgressPercent = a.ProgressPercent,
                    DueDate = a.DueDate,
                    IsOverdue = a.DueDate < today
                        && (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress),
                    AssignedAt = a.AssignedAt,
                    SubmittedAt = a.SubmittedAt,
                    ConfirmedAt = a.ConfirmedAt,
                    RejectionReason = a.RejectionReason
                })
                .ToListAsync();

            return Ok(items);
        }

        // PATCH api/training-assignments/{id}/due-date
        // HR sets an individual due date. Works on an ended intake too, which is how HR
        // extends someone who didn't finish. Finished assignments can't be changed.
        [HttpPatch("training-assignments/{id:int}/due-date")]
        public async Task<ActionResult<TrainingAssignmentListItem>> UpdateDueDate(
            int id, UpdateAssignmentDueDateRequest request)
        {
            var assignment = await Db.TrainingAssignments.FirstOrDefaultAsync(a => a.TrainingAssignmentId == id);

            if (assignment == null)
                return NotFound(new { message = $"No assignment found with TrainingAssignmentId {id}." });

            if (assignment.Status == TrainingAssignmentStatus.Completed
                || assignment.Status == TrainingAssignmentStatus.NotCompleted)
                return BadRequest(new { message = "The due date of a finished assignment can't be changed." });

            if (!request.DueDate.HasValue)
                return BadRequest(new { message = "DueDate is required." });

            var today = BusinessClock.Today;
            var newDue = request.DueDate.Value.Date;

            if (newDue < today)
                return BadRequest(new { message = "DueDate can't be in the past." });

            // A later due date means the 3-day reminder is wanted again
            if (newDue > assignment.DueDate.Date)
                assignment.ReminderSentAt = null;

            assignment.DueDate = newDue;
            assignment.UpdatedAt = DateTime.UtcNow;
            await Db.SaveChangesAsync();

            var item = await Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => a.TrainingAssignmentId == id)
                .Select(a => new TrainingAssignmentListItem
                {
                    TrainingAssignmentId = a.TrainingAssignmentId,
                    TrainingIntakeId = a.TrainingIntakeId,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.User!.FirstName + " " + a.Employee.User.LastName,
                    JobTitle = a.Employee.JobTitle,
                    DepartmentName = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    Status = a.Status,
                    ProgressPercent = a.ProgressPercent,
                    DueDate = a.DueDate,
                    IsOverdue = a.DueDate < today
                        && (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress),
                    AssignedAt = a.AssignedAt,
                    SubmittedAt = a.SubmittedAt,
                    ConfirmedAt = a.ConfirmedAt,
                    RejectionReason = a.RejectionReason
                })
                .FirstAsync();

            return Ok(item);
        }

        // ================= Reviewing: HR confirms or rejects submissions =================

        // GET api/training-assignments/awaiting-confirmation?programmeId=1&intakeId=2&search=sam
        // Oldest submission first, so whoever has waited longest is at the top.
        [HttpGet("training-assignments/awaiting-confirmation")]
        public async Task<ActionResult<List<AwaitingConfirmationItem>>> GetAwaitingConfirmation(
            [FromQuery] int? programmeId, [FromQuery] int? intakeId, [FromQuery] string? search)
        {
            var query = Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => a.Status == TrainingAssignmentStatus.AwaitingConfirmation);

            if (programmeId.HasValue)
                query = query.Where(a => a.Intake!.TrainingProgrammeId == programmeId.Value);

            if (intakeId.HasValue)
                query = query.Where(a => a.TrainingIntakeId == intakeId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(a =>
                    a.Employee!.User!.FirstName.Contains(s) ||
                    a.Employee.User.LastName.Contains(s) ||
                    a.Intake!.Programme!.Title.Contains(s));
            }

            var items = await query
                .OrderBy(a => a.SubmittedAt)
                .Select(a => new AwaitingConfirmationItem
                {
                    TrainingAssignmentId = a.TrainingAssignmentId,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.User!.FirstName + " " + a.Employee.User.LastName,
                    JobTitle = a.Employee.JobTitle,
                    DepartmentName = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    TrainingProgrammeId = a.Intake!.TrainingProgrammeId,
                    ProgrammeTitle = a.Intake.Programme!.Title,
                    TrainingIntakeId = a.TrainingIntakeId,
                    IntakeName = a.Intake.Name,
                    DueDate = a.DueDate,
                    SubmittedAt = a.SubmittedAt ?? a.UpdatedAt ?? a.AssignedAt,
                    WasRejectedBefore = a.RejectedAt != null,
                    PreviousRejectionReason = a.RejectionReason
                })
                .ToListAsync();

            var now = DateTime.UtcNow;
            foreach (var item in items)
                item.DaysWaiting = Math.Max(0, (int)(now - item.SubmittedAt).TotalDays);

            return Ok(items);
        }

        // POST api/training-assignments/{id}/confirm
        [HttpPost("training-assignments/{id:int}/confirm")]
        public async Task<ActionResult<TrainingReviewResponse>> Confirm(int id)
        {
            var assignment = await LoadForReviewAsync(id);
            if (assignment == null)
                return NotFound(new { message = $"No assignment found with TrainingAssignmentId {id}." });

            if (assignment.Status != TrainingAssignmentStatus.AwaitingConfirmation)
                return BadRequest(new { message = "Only a submission that is waiting for confirmation can be confirmed." });

            var now = DateTime.UtcNow;
            assignment.Status = TrainingAssignmentStatus.Completed;
            assignment.ProgressPercent = 100;
            assignment.ConfirmedAt = now;
            assignment.ConfirmedByUserId = CurrentUserId;

            // The latest decision is now "confirmed", so an earlier rejection no longer applies
            assignment.RejectedAt = null;
            assignment.RejectionReason = null;
            assignment.UpdatedAt = now;

            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = assignment.Employee!.UserId,
                Type = NotificationType.TrainingConfirmed,
                TemplateData = new()
                {
                    ["ProgrammeTitle"] = assignment.Intake!.Programme!.Title
                }
            });
            Db.Notifications.AddRange(notifications);

            await Db.SaveChangesAsync();

            return Ok(ToResponse(assignment));
        }

        // POST api/training-assignments/{id}/reject
        // The employee is told why and can submit again.
        [HttpPost("training-assignments/{id:int}/reject")]
        public async Task<ActionResult<TrainingReviewResponse>> Reject(int id, RejectTrainingRequest request)
        {
            var assignment = await LoadForReviewAsync(id);
            if (assignment == null)
                return NotFound(new { message = $"No assignment found with TrainingAssignmentId {id}." });

            if (assignment.Status != TrainingAssignmentStatus.AwaitingConfirmation)
                return BadRequest(new { message = "Only a submission that is waiting for confirmation can be rejected." });

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { message = "A reason is required when rejecting a submission." });

            var reason = request.Reason.Trim();
            if (reason.Length > MaxReasonLength)
                return BadRequest(new { message = $"The reason can't be longer than {MaxReasonLength} characters." });

            var now = DateTime.UtcNow;
            assignment.Status = TrainingAssignmentStatus.InProgress;
            assignment.SubmittedAt = null;
            assignment.RejectedAt = now;
            assignment.RejectionReason = reason;
            assignment.UpdatedAt = now;

            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = assignment.Employee!.UserId,
                Type = NotificationType.TrainingRejected,
                TemplateData = new()
                {
                    ["ProgrammeTitle"] = assignment.Intake!.Programme!.Title,
                    ["Reason"] = reason
                }
            });
            Db.Notifications.AddRange(notifications);

            await Db.SaveChangesAsync();

            return Ok(ToResponse(assignment));
        }

        private Task<TrainingAssignment?> LoadForReviewAsync(int id)
            => Db.TrainingAssignments
                .Include(a => a.Employee)
                .Include(a => a.Intake).ThenInclude(i => i!.Programme)
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id);

        private static TrainingReviewResponse ToResponse(TrainingAssignment a) => new()
        {
            TrainingAssignmentId = a.TrainingAssignmentId,
            Status = a.Status,
            ConfirmedAt = a.ConfirmedAt,
            ConfirmedByUserId = a.ConfirmedByUserId,
            RejectedAt = a.RejectedAt,
            RejectionReason = a.RejectionReason
        };

        // ================= Resolving: unfinished assignments of ended intakes =================

        // GET api/training-assignments/needs-resolution?programmeId=1&intakeId=2
        // Unfinished assignments (including submissions HR hasn't reviewed) in intakes that have ended.
        [HttpGet("training-assignments/needs-resolution")]
        public async Task<ActionResult<List<NeedsResolutionItem>>> GetNeedsResolution(
            [FromQuery] int? programmeId, [FromQuery] int? intakeId)
        {
            var today = BusinessClock.Today;

            var query = Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress
                            || a.Status == TrainingAssignmentStatus.AwaitingConfirmation)
                    && (a.Intake!.ClosedAt != null || a.Intake.EndDate < today));

            if (programmeId.HasValue)
                query = query.Where(a => a.Intake!.TrainingProgrammeId == programmeId.Value);

            if (intakeId.HasValue)
                query = query.Where(a => a.TrainingIntakeId == intakeId.Value);

            var items = await query
                .OrderBy(a => a.Intake!.EndDate)
                .ThenBy(a => a.Employee!.User!.FirstName)
                .Select(a => new NeedsResolutionItem
                {
                    TrainingAssignmentId = a.TrainingAssignmentId,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.User!.FirstName + " " + a.Employee.User.LastName,
                    JobTitle = a.Employee.JobTitle,
                    DepartmentName = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    TrainingProgrammeId = a.Intake!.TrainingProgrammeId,
                    ProgrammeTitle = a.Intake.Programme!.Title,
                    TrainingIntakeId = a.TrainingIntakeId,
                    IntakeName = a.Intake.Name,
                    IntakeEndDate = a.Intake.EndDate,
                    IntakeClosedEarly = a.Intake.ClosedAt != null,
                    Status = a.Status,
                    ProgressPercent = a.ProgressPercent,
                    DueDate = a.DueDate,
                    IsOverdue = a.DueDate < today
                        && (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress)
                })
                .ToListAsync();

            return Ok(items);
        }

        // POST api/training-assignments/{id}/mark-not-completed
        [HttpPost("training-assignments/{id:int}/mark-not-completed")]
        public async Task<ActionResult<TrainingResolutionResponse>> MarkNotCompleted(int id)
        {
            var assignment = await Db.TrainingAssignments
                .Include(a => a.Intake)
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id);

            if (assignment == null)
                return NotFound(new { message = $"No assignment found with TrainingAssignmentId {id}." });

            var error = CheckCanResolve(assignment);
            if (error != null)
                return BadRequest(new { message = error });

            var now = DateTime.UtcNow;
            assignment.Status = TrainingAssignmentStatus.NotCompleted;
            assignment.NotCompletedAt = now;
            assignment.UpdatedAt = now;
            await Db.SaveChangesAsync();

            return Ok(new TrainingResolutionResponse
            {
                TrainingAssignmentId = assignment.TrainingAssignmentId,
                Status = assignment.Status,
                NotCompletedAt = assignment.NotCompletedAt
            });
        }

        // POST api/training-assignments/{id}/move-to-intake
        // The old assignment becomes Not completed (history). A new one starts in the target
        // intake and keeps the employee's progress, so they carry on where they stopped.
        [HttpPost("training-assignments/{id:int}/move-to-intake")]
        public async Task<ActionResult<TrainingResolutionResponse>> MoveToIntake(int id, MoveToIntakeRequest request)
        {
            var assignment = await Db.TrainingAssignments
                .Include(a => a.Employee)
                .Include(a => a.Intake)
                .FirstOrDefaultAsync(a => a.TrainingAssignmentId == id);

            if (assignment == null)
                return NotFound(new { message = $"No assignment found with TrainingAssignmentId {id}." });

            var error = CheckCanResolve(assignment);
            if (error != null)
                return BadRequest(new { message = error });

            if (assignment.Employee!.Status != "Active")
                return BadRequest(new { message = "This employee is not active, so they can't be moved to another intake." });

            if (request.TargetIntakeId == assignment.TrainingIntakeId)
                return BadRequest(new { message = "Choose a different intake to move the employee to." });

            var target = await Db.TrainingIntakes
                .Include(i => i.Programme)
                .FirstOrDefaultAsync(i => i.TrainingIntakeId == request.TargetIntakeId);

            if (target == null)
                return BadRequest(new { message = "The target intake does not exist." });

            if (target.TrainingProgrammeId != assignment.Intake!.TrainingProgrammeId)
                return BadRequest(new { message = "The target intake must belong to the same programme." });

            var today = BusinessClock.Today;

            if (TrainingIntakeRules.GetState(target.ClosedAt, target.StartDate, target.EndDate, today) == TrainingIntakeState.Ended)
                return BadRequest(new { message = "The target intake has ended and can't take new people." });

            if (await Db.TrainingAssignments.AnyAsync(a =>
                    a.TrainingIntakeId == target.TrainingIntakeId && a.EmployeeId == assignment.EmployeeId))
                return BadRequest(new { message = "This employee is already in the target intake." });

            if (target.MaxParticipants.HasValue)
            {
                var count = await Db.TrainingAssignments.CountAsync(a => a.TrainingIntakeId == target.TrainingIntakeId);
                if (count >= target.MaxParticipants.Value)
                    return BadRequest(new { message = "The target intake is full." });
            }

            var dueDate = target.EndDate.Date;
            if (request.DueDate.HasValue)
            {
                dueDate = request.DueDate.Value.Date;
                if (dueDate < today)
                    return BadRequest(new { message = "DueDate can't be in the past." });
            }

            var now = DateTime.UtcNow;

            var moved = new TrainingAssignment
            {
                TrainingIntakeId = target.TrainingIntakeId,
                EmployeeId = assignment.EmployeeId,
                Status = assignment.Status,
                ProgressPercent = assignment.ProgressPercent,
                StartedAt = assignment.StartedAt,
                DueDate = dueDate,
                AssignedByUserId = CurrentUserId,
                AssignedAt = now
            };
            Db.TrainingAssignments.Add(moved);

            assignment.Status = TrainingAssignmentStatus.NotCompleted;
            assignment.NotCompletedAt = now;
            assignment.UpdatedAt = now;

            // Reuses the "assigned" notification, so the employee hears about their new intake
            var notifications = await _notificationService.Build(new NotificationRequest
            {
                UserId = assignment.Employee.UserId,
                Type = NotificationType.TrainingAssigned,
                TemplateData = new()
                {
                    ["ProgrammeTitle"] = target.Programme!.Title,
                    ["IntakeName"] = target.Name,
                    ["StartDate"] = FormatDate(target.StartDate),
                    ["DueDate"] = FormatDate(dueDate)
                }
            });
            Db.Notifications.AddRange(notifications);

            try
            {
                await Db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Someone else just changed this intake. Please reload and try again." });
            }

            return Ok(new TrainingResolutionResponse
            {
                TrainingAssignmentId = assignment.TrainingAssignmentId,
                Status = assignment.Status,
                NotCompletedAt = assignment.NotCompletedAt,
                NewTrainingAssignmentId = moved.TrainingAssignmentId,
                NewTrainingIntakeId = target.TrainingIntakeId,
                NewDueDate = moved.DueDate
            });
        }

        // Only unfinished assignments in an ended intake can be resolved this way.
        // A submission waiting for HR must be confirmed or rejected first.
        private static string? CheckCanResolve(TrainingAssignment assignment)
        {
            switch (assignment.Status)
            {
                case TrainingAssignmentStatus.Completed:
                case TrainingAssignmentStatus.NotCompleted:
                    return "This assignment is already finished.";
                case TrainingAssignmentStatus.AwaitingConfirmation:
                    return "This submission is waiting for confirmation. Confirm or reject it first.";
            }

            var intake = assignment.Intake!;
            var state = TrainingIntakeRules.GetState(intake.ClosedAt, intake.StartDate, intake.EndDate, BusinessClock.Today);
            if (state != TrainingIntakeState.Ended)
                return "The intake hasn't ended yet. You can resolve its unfinished assignments once it has ended or been closed.";

            return null;
        }

        // ================= Helpers =================

        private static string FormatDate(DateTime date)
            => date.ToString("d MMM yyyy", CultureInfo.InvariantCulture);
    }
}