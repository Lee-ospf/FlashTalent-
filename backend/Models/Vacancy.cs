using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    // NOTE: This is a MINIMAL STUB owned by Person A only so the Candidate domain
    // compiles and can be tested independently. Person B (Recruiter backend) owns
    // the full Vacancy table (Title, Description, Requirements, Type, ClientId,
    // Status, ClosingDate, etc - see the ERD). When merging branches, replace this
    // file with Person B's complete version - keep VacancyId and the class name
    // "Vacancy" identical so Application.cs and other FKs don't break.
    [Table("Vacancies")]
    public class Vacancy
    {
        [Key]
        public int VacancyId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public bool IsPublished { get; set; } = false;

        public ICollection<Application> Applications { get; set; } = new List<Application>();
    }
}