using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("HrProfiles")]
    public class HrProfile
    {
        [Key]
        public int HrProfileId { get; set; }

        [Required, ForeignKey(nameof(User))]
        public int UserId { get; set; }

        public User? User { get; set; }

        [MaxLength(100)]
        public string JobTitle { get; set; } = string.Empty;
    }
}