using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    // Builds the read-only training log for one employee. Shared by the employee's own
    // endpoint and the HR endpoint, so both always show exactly the same thing.
    public static class TrainingLogBuilder
    {
        // Returns null if the employee doesn't exist
        public static async Task<TrainingLogResponse?> BuildAsync(AppDbContext db, int employeeId)
        {
            var employee = await db.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new
                {
                    e.EmployeeId,
                    FirstName = e.User!.FirstName,
                    LastName = e.User.LastName
                })
                .FirstOrDefaultAsync();

            if (employee == null)
                return null;

            var today = BusinessClock.Today;

            var items = await db.TrainingAssignments
                .AsNoTracking()
                .Where(a => a.EmployeeId == employeeId)
                .Select(a => new TrainingLogItem
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
                    NotCompletedAt = a.NotCompletedAt,
                    RejectedAt = a.RejectedAt,
                    RejectionReason = a.RejectionReason,
                    FinishedAt = a.Status == TrainingAssignmentStatus.Completed
                        ? a.ConfirmedAt
                        : a.Status == TrainingAssignmentStatus.NotCompleted
                            ? a.NotCompletedAt
                            : null
                })
                .ToListAsync();

            var response = new TrainingLogResponse
            {
                EmployeeId = employee.EmployeeId,
                EmployeeName = employee.FirstName + " " + employee.LastName,

                Current = items
                    .Where(i => i.Status is TrainingAssignmentStatus.NotStarted
                        or TrainingAssignmentStatus.InProgress
                        or TrainingAssignmentStatus.AwaitingConfirmation)
                    .OrderBy(i => i.DueDate)
                    .ThenBy(i => i.ProgrammeTitle)
                    .ToList(),

                History = items
                    .Where(i => i.Status is TrainingAssignmentStatus.Completed
                        or TrainingAssignmentStatus.NotCompleted)
                    .OrderByDescending(i => i.FinishedAt ?? i.AssignedAt)
                    .ToList()
            };

            return response;
        }
    }
}