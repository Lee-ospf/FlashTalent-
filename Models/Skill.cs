
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace TalentHub.Models
{
    [Table("Skills")]
    public class Skill
    {
        [Key]
        public int SkillId { get; set; }

        [Required, MaxLength(100)]
        public string? Name { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        // Navigation
        public ICollection<Vacancy> Vacancies { get; set; } = new List<Vacancy>();
    }
}
