using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("Clients")]
    public class Client
    {
        [Key]
        public int ClientId { get; set; }

        [Required, MaxLength(150)]
        public string ClientName { get; set; }

        [MaxLength(100)]
        public string ContactPerson { get; set; }

        [MaxLength(150)]
        public string ContactEmail { get; set; }

        [MaxLength(20)]
        public string ContactPhone { get; set; }


        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation 
        public ICollection<Vacancy> Vacancies { get; set; }
    }
}
