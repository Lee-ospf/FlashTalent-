using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IDocumentValidationService
    {
        Task<MandatoryDocumentsStatusResponse> GetMandatoryStatusAsync(int candidateId);
    }

    public class DocumentValidationService : IDocumentValidationService
    {
        private readonly AppDbContext _db;

        // Mandatory documents per the scope doc: CV and Matric certificate.
        // Add more DocumentType values here if requirements expand later.
        private static readonly DocumentType[] MandatoryTypes =
        {
            DocumentType.CV,
            DocumentType.MatricCertificate
        };

        public DocumentValidationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<MandatoryDocumentsStatusResponse> GetMandatoryStatusAsync(int candidateId)
        {
            var uploadedTypes = await _db.CandidateDocuments
                .Where(d => d.CandidateId == candidateId)
                .Select(d => d.DocumentType)
                .ToListAsync();

            var hasCv = uploadedTypes.Contains(DocumentType.CV);
            var hasMatric = uploadedTypes.Contains(DocumentType.MatricCertificate);

            var missing = MandatoryTypes
                .Where(t => !uploadedTypes.Contains(t))
                .Select(t => t.ToString())
                .ToList();

            return new MandatoryDocumentsStatusResponse
            {
                CandidateId = candidateId,
                HasCv = hasCv,
                HasMatricCertificate = hasMatric,
                AllMandatoryDocumentsPresent = missing.Count == 0,
                MissingDocumentTypes = missing
            };
        }
    }
}