using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    public enum AddressType
    {
        Residential,
        Postal
    }

    // A candidate can have more than one address (e.g. Residential vs Postal,
    // common in SA where a PO Box differs from where someone actually lives).
    [Table("Addresses")]
    public class Address
    {
        [Key]
        public int AddressId { get; set; }

        [Required, ForeignKey(nameof(Candidate))]
        public int CandidateId { get; set; }

        public Candidate? Candidate { get; set; }

        [Required]
        public AddressType AddressType { get; set; }

        [Required, MaxLength(200)]
        public string Line1 { get; set; } = string.Empty; // street address / PO Box number

        [MaxLength(200)]
        public string? Line2 { get; set; } // unit, complex, suburb detail - optional

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Province { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string PostalCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Country { get; set; } = "South Africa";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}