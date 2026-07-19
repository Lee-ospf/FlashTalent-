using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TalentHub.Models
{
    
    public class VacancyDocument
    {
      
            [Key]
            public int VacancyDocumentId { get; set; }

            [ForeignKey(nameof(Vacancy))]
            public int VacancyId { get; set; }
            public Vacancy Vacancy { get; set; } = new Vacancy();

            [Required]
            public DocumentType DocumentType { get; set; }

            public bool IsMandatory { get; set; } = true;
        
    }
}
