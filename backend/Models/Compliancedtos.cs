using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.DTOs
{
    // ================= Certifications =================

    // One certification that is expiring or has expired (HR screen)
    public class CertificationExpiryItem
    {
        public int EmployeeQualificationId { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }

        public string CertificationName { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }

        // Calendar days until expiry. Negative once expired.
        public int DaysLeft { get; set; }

        public CertificationExpiryStatus Status { get; set; }

        // true = expired longer ago than the alert window, so the daily job sends nothing for it.
        // It is still listed so HR can follow it up.
        public bool IsPastAlertWindow { get; set; }
    }

    // A certification on an active employee's profile that has no expiry date
    public class CertificationNoExpiryItem
    {
        public int EmployeeQualificationId { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? DepartmentName { get; set; }

        public string CertificationName { get; set; } = string.Empty;
        public string Institution { get; set; } = string.Empty;
        public DateTime ObtainedOn { get; set; }
    }

    // ================= Training =================

    // An unfinished assignment past its due date. Overdue is calculated, never stored.
    public class OverdueTrainingItem
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

        public TrainingAssignmentStatus Status { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime DueDate { get; set; }

        // Whole days past the due date
        public int DaysOverdue { get; set; }
    }

    // ================= Dashboard =================

    // Counts for the HR dashboard
    public class ComplianceSummaryResponse
    {
        // 31 to 90 days left
        public int ExpiringIn90Days { get; set; }
        // 8 to 30 days left
        public int ExpiringIn30Days { get; set; }
        // 1 to 7 days left
        public int ExpiringIn7Days { get; set; }
        // Expiry date today or earlier (includes long-expired)
        public int Expired { get; set; }

        public int CertificatesWithNoExpiryDate { get; set; }

        public int OverdueTraining { get; set; }
        public int AwaitingConfirmation { get; set; }
    }

    // ================= Employee training log =================

    // One line of the read-only training log
    public class TrainingLogItem
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

        public TrainingAssignmentStatus Status { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime DueDate { get; set; }

        // Calculated, never stored: past the due date and still NotStarted or InProgress
        public bool IsOverdue { get; set; }

        public DateTime AssignedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }

        // History: the date HR confirmed (Completed) or marked it Not completed
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? NotCompletedAt { get; set; }

        // HR's latest rejection. Show the reason while Status is InProgress.
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }

        // When the assignment finished (Completed or Not completed). Null while current.
        public DateTime? FinishedAt { get; set; }
    }

    public class TrainingLogResponse
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;

        // Not started, In progress, Awaiting confirmation. Earliest due date first.
        public List<TrainingLogItem> Current { get; set; } = new();

        // Completed and Not completed, newest first, including earlier runs of the same programme
        public List<TrainingLogItem> History { get; set; } = new();
    }
}