using TalentHub.Services;

namespace TalentHub.DTOs
{
    // Used for update (PUT). The programme of an intake never changes.
    public class SaveTrainingIntakeRequest
    {
        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // null = no limit
        public int? MaxParticipants { get; set; }
    }

    public class CreateTrainingIntakeRequest : SaveTrainingIntakeRequest
    {
        public int TrainingProgrammeId { get; set; }
    }

    public class TrainingIntakeListItem
    {
        public int TrainingIntakeId { get; set; }
        public int TrainingProgrammeId { get; set; }
        public string ProgrammeTitle { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TrainingIntakeState State { get; set; }
        public int? MaxParticipants { get; set; }
        public int AssignmentCount { get; set; }
        public int CompletedCount { get; set; }

        // Used only to calculate State
        internal DateTime? ClosedAt { get; set; }
    }

    public class TrainingIntakeResponse
    {
        public int TrainingIntakeId { get; set; }
        public int TrainingProgrammeId { get; set; }
        public string ProgrammeTitle { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TrainingIntakeState State { get; set; }
        public int? MaxParticipants { get; set; }

        // null when there is no maximum
        public int? SpotsLeft { get; set; }

        public int AssignmentCount { get; set; }
        public int CompletedCount { get; set; }
        public int AwaitingConfirmationCount { get; set; }

        public DateTime? ClosedAt { get; set; }
        public string? ClosedByName { get; set; }
        public int CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}