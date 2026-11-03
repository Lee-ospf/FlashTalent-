using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum CareerGoalStatus
    {
        Active,
        Achieved,
        Archived
    }

    // What a piece of advice was generated for
    public enum SuggestionSource
    {
        CareerGoal,   // "I want to become a tech lead"
        Project       // closing the gap between an employee and a project's required skills
    }

    public enum SuggestionItemStatus
    {
        Suggested,
        Accepted,
        Dismissed
    }

    // Who the employee wants to become. Free text, written by the employee.
    // Never deleted: an old goal is Archived or Achieved, so history stays.
    [Table("CareerGoals")]
    public class CareerGoal
    {
        [Key]
        public int CareerGoalId { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        // e.g. "Tech Lead", "Data Analyst". The cap keeps free text from carrying personal details.
        [Required, MaxLength(200)]
        public string TargetRole { get; set; } = string.Empty;

        // Optional "by when", date only
        [Column(TypeName = "date")]
        public DateTime? TargetDate { get; set; }

        [Required]
        public CareerGoalStatus Status { get; set; } = CareerGoalStatus.Active;

        // The employee decides. When false, HR can't see the goal and it is left out of reports.
        public bool ShareWithHr { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    // One generated set of advice. Refreshed in place (like ProjectMatch), so there is
    // at most one per career goal, and one per project and employee.
    // Named SkillAdvice (not SkillSuggestion) because TalentHub.DTOs already has a SkillSuggestion class.
    [Table("SkillAdvices")]
    public class SkillAdvice
    {
        [Key]
        public int SkillAdviceId { get; set; }

        // The employee the advice is for
        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        [Required]
        public SuggestionSource Source { get; set; }

        // Exactly one of these is set, matching Source (the database enforces it)
        [ForeignKey(nameof(CareerGoal))]
        public int? CareerGoalId { get; set; }
        public CareerGoal? CareerGoal { get; set; }

        [ForeignKey(nameof(Project))]
        public int? ProjectId { get; set; }
        public Project? Project { get; set; }

        // The AI's short overview of the path
        [MaxLength(2000)]
        public string? Summary { get; set; }

        // Hash of what the AI was shown (skills, levels, job title, goal or project, catalogue).
        // If today's hash differs, the saved advice is out of date.
        [Required, MaxLength(64)]
        public string InputFingerprint { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? ModelVersion { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Who pressed the button: the employee, or an HR user
        [ForeignKey(nameof(GeneratedByUser))]
        public int? GeneratedByUserId { get; set; }
        public User? GeneratedByUser { get; set; }

        public ICollection<SkillAdviceItem> Items { get; set; } = new List<SkillAdviceItem>();
    }

    // One step of the learning path
    [Table("SkillAdviceItems")]
    public class SkillAdviceItem
    {
        [Key]
        public int SkillAdviceItemId { get; set; }

        [Required, ForeignKey(nameof(Advice))]
        public int SkillAdviceId { get; set; }
        public SkillAdvice? Advice { get; set; }

        // Order in the path: 1 is first
        public int SortOrder { get; set; }

        // Set when the skill name matched a row in the Skills table. Null = a skill the system
        // doesn't have yet. Those names feed the Admin report of skills worth adding.
        [ForeignKey(nameof(Skill))]
        public int? SkillId { get; set; }
        public Skill? Skill { get; set; }

        // The skill name as shown to the user (the Skills table name when matched)
        [Required, MaxLength(100)]
        public string SkillName { get; set; } = string.Empty;

        // Level to aim for, when the advice names one
        public ProficiencyLevel? TargetLevel { get; set; }

        // The advice text for this step
        [Required, MaxLength(1000)]
        public string AdviceText { get; set; } = string.Empty;

        // A real course from the catalogue, checked in code before saving
        [ForeignKey(nameof(Programme))]
        public int? TrainingProgrammeId { get; set; }
        public TrainingProgramme? Programme { get; set; }

        // An idea from outside the catalogue. Shown as "AI suggestion, not verified", never a link.
        [MaxLength(300)]
        public string? ExternalIdea { get; set; }

        [Required]
        public SuggestionItemStatus Status { get; set; } = SuggestionItemStatus.Suggested;

        public DateTime? StatusChangedAt { get; set; }

        // "Assigned" is deliberately not stored here: it is worked out by checking whether the
        // employee already has an assignment for the programme.
    }

    // One row per successful AI generation. Used for the daily limit per employee
    // (a refresh overwrites GeneratedAt on the advice, so it can't be counted from there)
    // and as a cost and audit trail.
    [Table("SkillAdviceRuns")]
    public class SkillAdviceRun
    {
        [Key]
        public int SkillAdviceRunId { get; set; }

        [Required, ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        [Required, ForeignKey(nameof(RequestedByUser))]
        public int RequestedByUserId { get; set; }
        public User? RequestedByUser { get; set; }

        [Required]
        public SuggestionSource Source { get; set; }

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    }
}