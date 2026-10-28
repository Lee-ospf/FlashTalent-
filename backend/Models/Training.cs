using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum TrainingAssignmentStatus
    {
        NotStarted,
        InProgress,
        AwaitingConfirmation,
        Completed,
        NotCompleted
    }

    // Reminder points for certification expiry. Expired = on or after the expiry date.
    public enum CertificationReminderPoint
    {
        Days90,
        Days30,
        Days7,
        Expired
    }

    // Permanent catalogue entry. Never tied to dates: dates belong to intakes.
    [Table("TrainingProgrammes")]
    public class TrainingProgramme
    {
        [Key]
        public int TrainingProgrammeId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(200)]
        public string? Provider { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal? DurationHours { get; set; }

        [MaxLength(500)]
        public string? Url { get; set; }

        // false = retired. Only allowed when no intake is running (checked in the service).
        public bool IsActive { get; set; } = true;

        [Required, ForeignKey(nameof(CreatedByUser))]
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<TrainingProgrammeSkill> Skills { get; set; } = new List<TrainingProgrammeSkill>();
        public ICollection<TrainingIntake> Intakes { get; set; } = new List<TrainingIntake>();
    }

    [Table("TrainingProgrammeSkills")]
    public class TrainingProgrammeSkill
    {
        [Key]
        public int TrainingProgrammeSkillId { get; set; }

        [Required, ForeignKey(nameof(Programme))]
        public int TrainingProgrammeId { get; set; }
        public TrainingProgramme? Programme { get; set; }

        [Required, ForeignKey(nameof(Skill))]
        public int SkillId { get; set; }
        public Skill? Skill { get; set; }
    }

    // One run of a programme. State (Upcoming / Running / Ended) is calculated:
    //   ClosedAt != null or today > EndDate  -> Ended
    //   today < StartDate                    -> Upcoming
    //   otherwise                            -> Running
    [Table("TrainingIntakes")]
    public class TrainingIntake
    {
        [Key]
        public int TrainingIntakeId { get; set; }

        [Required, ForeignKey(nameof(Programme))]
        public int TrainingProgrammeId { get; set; }
        public TrainingProgramme? Programme { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, Column(TypeName = "date")]
        public DateTime StartDate { get; set; }

        [Required, Column(TypeName = "date")]
        public DateTime EndDate { get; set; }

        // null = no limit
        public int? MaxParticipants { get; set; }

        // Set when HR closes the intake before its end date
        public DateTime? ClosedAt { get; set; }

        [ForeignKey(nameof(ClosedByUser))]
        public int? ClosedByUserId { get; set; }
        public User? ClosedByUser { get; set; }

        [Required, ForeignKey(nameof(CreatedByUser))]
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<TrainingAssignment> Assignments { get; set; } = new List<TrainingAssignment>();
    }

    // An employee placed in an intake. Overdue is never stored: it is
    // DueDate < today while Status is NotStarted or InProgress.
    [Table("TrainingAssignments")]
    public class TrainingAssignment
    {
        [Key]
        public int TrainingAssignmentId { get; set; }

        [Required, ForeignKey(nameof(Intake))]
        public int TrainingIntakeId { get; set; }
        public TrainingIntake? Intake { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        [Required]
        public TrainingAssignmentStatus Status { get; set; } = TrainingAssignmentStatus.NotStarted;

        // 0 to 100, set by the employee
        public int ProgressPercent { get; set; } = 0;

        // Defaults to the intake's end date, HR can override per person
        [Required, Column(TypeName = "date")]
        public DateTime DueDate { get; set; }

        [Required, ForeignKey(nameof(AssignedByUser))]
        public int AssignedByUserId { get; set; }
        public User? AssignedByUser { get; set; }

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAt { get; set; }

        // Employee clicked "Completed"
        public DateTime? SubmittedAt { get; set; }

        // HR decision (latest only)
        public DateTime? ConfirmedAt { get; set; }

        [ForeignKey(nameof(ConfirmedByUser))]
        public int? ConfirmedByUserId { get; set; }
        public User? ConfirmedByUser { get; set; }

        public DateTime? RejectedAt { get; set; }

        [MaxLength(1000)]
        public string? RejectionReason { get; set; }

        // Set by HR at intake end
        public DateTime? NotCompletedAt { get; set; }

        // One reminder, 3 days before DueDate
        public DateTime? ReminderSentAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }

    // Stops duplicate certification alerts. One row per qualification, expiry date
    // and reminder point. A changed expiry date means new rows, so renewals restart the cycle.
    [Table("CertificationReminderLogs")]
    public class CertificationReminderLog
    {
        [Key]
        public int CertificationReminderLogId { get; set; }

        [Required, ForeignKey(nameof(Qualification))]
        public int EmployeeQualificationId { get; set; }
        public EmployeeQualification? Qualification { get; set; }

        // The expiry date this reminder was for
        [Required, Column(TypeName = "date")]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public CertificationReminderPoint ReminderPoint { get; set; }

        // true = notification sent. false = older point logged as covered by a tighter one.
        public bool WasSent { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}