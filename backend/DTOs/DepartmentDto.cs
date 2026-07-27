using System.ComponentModel.DataAnnotations;

namespace TalentHub.DTOs
{
    public class CreateDepartmentDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; }
    }
    public class DepartmentResponse
    {
        public int DepartmentId { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
    }
}
