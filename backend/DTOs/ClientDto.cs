using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class ClientDto
    {
        [Required, MaxLength(150)]
        public string ClientName { get; set; }

        [MaxLength(100)]
        public string ContactPerson { get; set; }

        [MaxLength(150)]
        public string ContactEmail { get; set; }

        [MaxLength(20)]
        public string ContactPhone { get; set; }
    }
    public class ClientResponse
    {
        public int ClientId { get; set; }
        public string ClientName { get; set; }
        public string ContactPerson { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
    }
}
