using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.DTOs
{
    public class UpdateTrainingProgressRequest
    {
        // 0 to 100
        public int ProgressPercent { get; set; }
    }

    // One of the logged-in employee's own training assignments
    public class MyTrainingResponse
    {
        public int TrainingAssignmentId { get; set; }

        public int TrainingProgrammeId { get; set; }
        public string ProgrammeTitle { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }
        public string? Url { get; set; }

        public int TrainingIntakeId { get; set; }
        public string IntakeName { get; set; } = string.Empty;
        public DateTime IntakeStartDate { get; set; }
        public DateTime IntakeEndDate { get; set; }
        public TrainingIntakeState IntakeState { get; set; }

        public TrainingAssignmentStatus Status { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime DueDate { get; set; }

        // Calculated, never stored: past the due date and still NotStarted or InProgress
        public bool IsOverdue { get; set; }

        public DateTime AssignedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? RejectedAt { get; set; }

        // HR's latest rejection reason. Show it while Status is InProgress.
        public string? RejectionReason { get; set; }

        // What the screen may offer right now
        public bool CanUpdateProgress { get; set; }
        public bool CanSubmit { get; set; }
        public bool CanWithdraw { get; set; }

        // Used only to calculate IntakeState
        internal DateTime? IntakeClosedAt { get; set; }
    }
}