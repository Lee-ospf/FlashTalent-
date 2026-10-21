using TalentHub.Models;

namespace TalentHub.DTOs
{
    // ================= Assigning =================

    public class AssignEmployeesRequest
    {
        public List<int> EmployeeIds { get; set; } = new();

        // null = everyone gets the intake's end date
        public DateTime? DueDate { get; set; }
    }

    public class AssignedEmployeeResponse
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int TrainingAssignmentId { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class SkippedEmployeeResponse
    {
        public int EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class AssignEmployeesResponse
    {
        public List<AssignedEmployeeResponse> Added { get; set; } = new();
        public List<SkippedEmployeeResponse> Skipped { get; set; } = new();
    }

    public class UpdateAssignmentDueDateRequest
    {
        public DateTime? DueDate { get; set; }
    }

    public class TrainingAssignmentListItem
    {
        public int TrainingAssignmentId { get; set; }
        public int TrainingIntakeId { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }
        public TrainingAssignmentStatus Status { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime DueDate { get; set; }

        // Calculated, never stored: past the due date and still NotStarted or InProgress
        public bool IsOverdue { get; set; }

        public DateTime AssignedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    // ================= Reviewing =================

    public class RejectTrainingRequest
    {
        // Required. Shown to the employee.
        public string Reason { get; set; } = string.Empty;
    }

    // One submission waiting for HR
    public class AwaitingConfirmationItem
    {
        public int TrainingAssignmentId { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }

        public int TrainingProgrammeId { get; set; }
        public string ProgrammeTitle { get; set; } = string.Empty;
        public int TrainingIntakeId { get; set; }
        public string IntakeName { get; set; } = string.Empty;

        public DateTime DueDate { get; set; }
        public DateTime SubmittedAt { get; set; }

        // Whole days since the employee submitted
        public int DaysWaiting { get; set; }

        // true if HR rejected an earlier submission of this same assignment
        public bool WasRejectedBefore { get; set; }
        public string? PreviousRejectionReason { get; set; }
    }

    // Result of a confirm or reject
    public class TrainingReviewResponse
    {
        public int TrainingAssignmentId { get; set; }
        public TrainingAssignmentStatus Status { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public int? ConfirmedByUserId { get; set; }
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    // ================= Resolving =================

    public class MoveToIntakeRequest
    {
        // Must be another intake of the same programme that hasn't ended
        public int TargetIntakeId { get; set; }

        // null = the target intake's end date
        public DateTime? DueDate { get; set; }
    }

    // An unfinished assignment sitting in an intake that has ended. HR must resolve it.
    public class NeedsResolutionItem
    {
        public int TrainingAssignmentId { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }

        public int TrainingProgrammeId { get; set; }
        public string ProgrammeTitle { get; set; } = string.Empty;
        public int TrainingIntakeId { get; set; }
        public string IntakeName { get; set; } = string.Empty;
        public DateTime IntakeEndDate { get; set; }
        public bool IntakeClosedEarly { get; set; }

        public TrainingAssignmentStatus Status { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime DueDate { get; set; }
        public bool IsOverdue { get; set; }
    }

    public class TrainingResolutionResponse
    {
        // The assignment HR acted on
        public int TrainingAssignmentId { get; set; }
        public TrainingAssignmentStatus Status { get; set; }
        public DateTime? NotCompletedAt { get; set; }

        // Only when moved: the new assignment in the target intake
        public int? NewTrainingAssignmentId { get; set; }
        public int? NewTrainingIntakeId { get; set; }
        public DateTime? NewDueDate { get; set; }
    }
}