using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateRecruiterDto
    {
        [Required]
        public int UserId { get; set; }

        [MaxLength(100)]
        public string JobTitle { get; set; }
    }
    public class RecruiterResponse
    {
        public int RecruiterId { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string JobTitle { get; set; }
    }
}
