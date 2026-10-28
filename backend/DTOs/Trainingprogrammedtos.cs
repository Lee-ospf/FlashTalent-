namespace TalentHub.DTOs
{
    // Used for both create (POST) and update (PUT)
    public class SaveTrainingProgrammeRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }
        public string? Url { get; set; }

        // Optional: the skills this training builds
        public List<int>? SkillIds { get; set; }
    }

    public class TrainingProgrammeSkillResponse
    {
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
    }

    public class TrainingProgrammeListItem
    {
        public int TrainingProgrammeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }
        public bool IsActive { get; set; }
        public int SkillCount { get; set; }
        public int IntakeCount { get; set; }

        // Upcoming or running intakes (not ended, not closed early)
        public int OpenIntakeCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TrainingProgrammeResponse
    {
        public int TrainingProgrammeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }
        public string? Url { get; set; }
        public bool IsActive { get; set; }
        public int CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int IntakeCount { get; set; }
        public int OpenIntakeCount { get; set; }
        public List<TrainingProgrammeSkillResponse> Skills { get; set; } = new();
    }
}