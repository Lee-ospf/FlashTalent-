using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateAddressRequest
    {
        [Required]
        public string AddressType { get; set; } = string.Empty; // "Residential" or "Postal"

        [Required, MaxLength(200)]
        public string Line1 { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Province { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        [RegularExpression(@"^\d{4}$",
            ErrorMessage = "Postal code must be exactly 4 digits (South African format).")]
        public string PostalCode { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Country { get; set; } = "South Africa";
    }

    public class UpdateAddressRequest
    {
        [Required, MaxLength(200)]
        public string Line1 { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Province { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        [RegularExpression(@"^\d{4}$",
            ErrorMessage = "Postal code must be exactly 4 digits (South African format).")]
        public string PostalCode { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Country { get; set; } = "South Africa";
    }

    public class AddressResponse
    {
        public int AddressId { get; set; }
        public int CandidateId { get; set; }
        public string AddressType { get; set; } = string.Empty;
        public string Line1 { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}