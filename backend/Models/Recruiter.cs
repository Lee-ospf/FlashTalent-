using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace TalentHub.Models
{

    [Table("Recruiters")]
    public class Recruiter
    {
        [Key]
        public int RecruiterId { get; set; }

        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        [MaxLength(100)]
        public string JobTitle { get; set; }


        // Navigation to all the vacancies they manage
        public ICollection<Vacancy> VacanciesCreated { get; set; }
    }
}
