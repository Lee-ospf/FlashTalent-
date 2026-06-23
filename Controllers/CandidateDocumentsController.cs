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
    public class CandidateDocumentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IDocumentValidationService _validationService;
        private readonly IWebHostEnvironment _env;

        // Keep these as the single source of truth for accepted uploads.
        private static readonly string[] AllowedExtensions = { ".pdf", ".doc", ".docx" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public CandidateDocumentsController(
            AppDbContext db,
            IDocumentValidationService validationService,
            IWebHostEnvironment env)
        {
            _db = db;
            _validationService = validationService;
            _env = env;
        }

        // POST api/candidates/{candidateId}/documents
        // multipart/form-data with fields: file (the actual file), documentType (string enum name)
        [HttpPost]
        [RequestSizeLimit(MaxFileSizeBytes + 1024)] // small buffer above the limit so our own check returns the friendlier message
        public async Task<ActionResult<CandidateDocumentResponse>> Upload(
            int candidateId,
            [FromForm] string documentType,
            IFormFile file)
        {
            var candidate = await _db.Candidates.FindAsync(candidateId);
            if (candidate == null)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

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
                UploadedAt = DateTime.UtcNow
            };

            _db.CandidateDocuments.Add(document);
            await _db.SaveChangesAsync();

            return Ok(new CandidateDocumentResponse
            {
                CandidateDocumentId = document.CandidateDocumentId,
                CandidateId = document.CandidateId,
                DocumentType = document.DocumentType.ToString(),
                FileUrl = document.FileUrl,
                OriginalFileName = document.OriginalFileName,
                UploadedAt = document.UploadedAt
            });
        }

        // GET api/candidates/{candidateId}/documents
        [HttpGet]
        public async Task<ActionResult<List<CandidateDocumentResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var documents = await _db.CandidateDocuments
                .Where(d => d.CandidateId == candidateId)
                .Select(d => new CandidateDocumentResponse
                {
                    CandidateDocumentId = d.CandidateDocumentId,
                    CandidateId = d.CandidateId,
                    DocumentType = d.DocumentType.ToString(),
                    FileUrl = d.FileUrl,
                    OriginalFileName = d.OriginalFileName,
                    UploadedAt = d.UploadedAt
                })
                .ToListAsync();

            return Ok(documents);
        }

        // GET api/candidates/{candidateId}/documents/mandatory-status
        [HttpGet("mandatory-status")]
        public async Task<ActionResult<MandatoryDocumentsStatusResponse>> GetMandatoryStatus(int candidateId)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
            {
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });
            }

            var status = await _validationService.GetMandatoryStatusAsync(candidateId);
            return Ok(status);
        }
    }
}