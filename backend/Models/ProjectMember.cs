using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    [Table("ProjectMembers")]
    public class ProjectMember
    {
        [Key]
        public int ProjectMemberId { get; set; }

        [ForeignKey(nameof(Project))]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [ForeignKey(nameof(Employee))]
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        // Audit: who added them, and when
        [Required, ForeignKey(nameof(AddedByUser))]
        public int AddedByUserId { get; set; }
        public User? AddedByUser { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}