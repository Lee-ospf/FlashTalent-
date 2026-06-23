using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateSkillRequest
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Category { get; set; } = string.Empty;
    }

    public class UpdateSkillRequest
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Category { get; set; } = string.Empty;
    }

    public class SkillResponse
    {
        public int SkillId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }

    public class AssignSkillRequest
    {
        [Required]
        public int SkillId { get; set; }

        [Required]
        public string ProficiencyLevel { get; set; } = "Beginner";
    }

    public class AssignSkillsRequest
    {
        [Required]
        public List<AssignSkillRequest> Skills { get; set; } = new();
    }

    public class CandidateSkillResponse
    {
        public int CandidateSkillId { get; set; }
        public int SkillId { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ProficiencyLevel { get; set; } = string.Empty;
        public DateTime AddedAt { get; set; }
    }
}
