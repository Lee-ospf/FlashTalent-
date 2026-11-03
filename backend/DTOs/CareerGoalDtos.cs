using System.ComponentModel.DataAnnotations;
using TalentHub.Models;

namespace TalentHub.DTOs
{
    public class CreateCareerGoalRequest
    {
        // e.g. "Tech Lead". Up to 200 characters.
        public string TargetRole { get; set; } = string.Empty;

        // Optional "by when"
        public DateTime? TargetDate { get; set; }

        // Defaults to true. The employee decides.
        public bool ShareWithHr { get; set; } = true;
    }

    // Same shape: edit replaces all three values
    public class UpdateCareerGoalRequest : CreateCareerGoalRequest
    {
    }

    public class CareerGoalResponse
    {
        public int CareerGoalId { get; set; }
        public int EmployeeId { get; set; }
        public string TargetRole { get; set; } = string.Empty;
        public DateTime? TargetDate { get; set; }
        public CareerGoalStatus Status { get; set; }
        public bool ShareWithHr { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // true once advice has been generated, so the screen can show "View advice" or "Get advice"
        public bool HasAdvice { get; set; }
        public DateTime? AdviceGeneratedAt { get; set; }
    }
}