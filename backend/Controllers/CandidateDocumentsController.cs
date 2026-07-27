using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/documents")]
    [Authorize]
    public class CandidateDocumentsController : TalentHubControllerBase
    {
        private readonly IDocumentValidationService _validationService;
        private readonly IWebHostEnvironment _env;

        // Keep these as the single source of truth for accepted uploads.
        private static readonly string[] AllowedExtensions = { ".pdf", ".doc", ".docx" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public CandidateDocumentsController(
            AppDbContext db,
            IDocumentValidationService validationService,
            IWebHostEnvironment env) : base(db)
        {
            _validationService = validationService;
            _env = env;
        }

        // POST api/candidates/{candidateId}/documents
        // multipart/form-data with fields: file, documentType, and OPTIONAL qualificationId.
        // Pass qualificationId when this document is proof/attachment for a specific qualification
        // entry (e.g. a degree certificate) rather than a general standalone upload.
        [HttpPost]
        [RequestSizeLimit(MaxFileSizeBytes + 1024)] // small buffer above the limit so our own check returns the friendlier message
        public async Task<ActionResult<CandidateDocumentResponse>> Upload(
            int candidateId,
            [FromForm] string documentType,
            [FromForm] int? qualificationId,
            IFormFile file)
        {
            var candidate = await Db.Candidates.FindAsync(candidateId);
            if (candidate == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = $"File exceeds the maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    message = $"File type '{extension}' is not allowed. Accepted types: {string.Join(", ", AllowedExtensions)}."
                });
            }

            if (!Enum.TryParse<DocumentType>(documentType, true, out var parsedDocType))
            {
                var validTypes = string.Join(", ", Enum.GetNames(typeof(DocumentType)));
                return BadRequest(new { message = $"Invalid documentType '{documentType}'. Valid values: {validTypes}." });
            }

            // If a qualificationId was supplied, confirm it exists AND belongs to this same candidate -
            // stops one candidate from attaching a document to another candidate's qualification.
            if (qualificationId.HasValue)
            {
                var belongsToCandidate = await Db.CandidateQualifications
                    .AnyAsync(q => q.CandidateQualificationId == qualificationId.Value && q.CandidateId == candidateId);

                if (!belongsToCandidate)
                {
                    return BadRequest(new { message = $"No qualification found with id {qualificationId.Value} for this candidate." });
                }
            }

            // Save the file to disk under Uploads/{candidateId}/
            var uploadsRoot = Path.Combine(_env.ContentRootPath, "Uploads");
            var candidateFolder = Path.Combine(uploadsRoot, candidateId.ToString());
            Directory.CreateDirectory(candidateFolder);

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(candidateFolder, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Relative URL clients can use to fetch the file back via static file middleware
            var relativeUrl = $"/Uploads/{candidateId}/{uniqueFileName}";

            var document = new CandidateDocument
            {
                CandidateId = candidateId,
                DocumentType = parsedDocType,
                FileUrl = relativeUrl,
                OriginalFileName = file.FileName,
                UploadedAt = DateTime.UtcNow,
                QualificationId = qualificationId
            };

            Db.CandidateDocuments.Add(document);
            await Db.SaveChangesAsync();

            return Ok(new CandidateDocumentResponse
            {
                CandidateDocumentId = document.CandidateDocumentId,
                CandidateId = document.CandidateId,
                DocumentType = document.DocumentType.ToString(),
                FileUrl = document.FileUrl,
                OriginalFileName = document.OriginalFileName,
                UploadedAt = document.UploadedAt,
                QualificationId = document.QualificationId
            });
        }

        // GET api/candidates/{candidateId}/documents
        // Optional ?qualificationId= filter - pass it to get only documents attached to that qualification.
        [HttpGet]
        public async Task<ActionResult<List<CandidateDocumentResponse>>> GetAll(int candidateId, [FromQuery] int? qualificationId)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var query = Db.CandidateDocuments.Where(d => d.CandidateId == candidateId);

            if (qualificationId.HasValue)
            {
                query = query.Where(d => d.QualificationId == qualificationId.Value);
            }

            var documents = await query
                .Select(d => new CandidateDocumentResponse
                {
                    CandidateDocumentId = d.CandidateDocumentId,
                    CandidateId = d.CandidateId,
                    DocumentType = d.DocumentType.ToString(),
                    FileUrl = d.FileUrl,
                    OriginalFileName = d.OriginalFileName,
                    UploadedAt = d.UploadedAt,
                    QualificationId = d.QualificationId
                })
                .ToListAsync();

            return Ok(documents);
        }

        // GET api/candidates/{candidateId}/documents/mandatory-status
        [HttpGet("mandatory-status")]
        public async Task<ActionResult<MandatoryDocumentsStatusResponse>> GetMandatoryStatus(int candidateId)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            if (!await IsOwnerOrPrivileged(candidateId)) return Forbid();

            var status = await _validationService.GetMandatoryStatusAsync(candidateId);
            return Ok(status);
        }
    }
}