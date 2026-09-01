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
    [Route("api/candidates/{candidateId}/resume-parsing")]
    [Authorize] // candidate must be logged in - this never runs anonymously
    public class ResumeParsingController : TalentHubControllerBase
    {
        private readonly IResumeParsingService _resumeParsingService;
        private readonly IWebHostEnvironment _env;

        public ResumeParsingController(
            AppDbContext db,
            IResumeParsingService resumeParsingService,
            IWebHostEnvironment env) : base(db)
        {
            _resumeParsingService = resumeParsingService;
            _env = env;
        }

        // POST api/candidates/{candidateId}/resume-parsing/parse-cv
        //
        // No file upload here on purpose - this reuses whichever CV the
        // candidate already uploaded via CandidateDocumentsController's normal
        // upload endpoint. We look up their most recent DocumentType.CV entry
        // and read it straight off disk using the same Uploads/{candidateId}/
        // convention that controller writes to.
        //
        // This is a preview/extraction step only - nothing is saved to the
        // candidate's profile here. The frontend shows the result for review
        // and the candidate saves it themselves via the normal
        // Skills/Experience/Qualifications endpoints.
        [HttpPost("parse-cv")]
        public async Task<ActionResult<ParsedResumeResponse>> ParseCv(int candidateId, CancellationToken ct)
        {
            var candidateExists = await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId, ct);
            if (!candidateExists)
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });

            if (!await IsOwnerOrAdmin(candidateId)) return Forbid();

            var cvDocument = await Db.CandidateDocuments
                .Where(d => d.CandidateId == candidateId && d.DocumentType == DocumentType.CV)
                .OrderByDescending(d => d.UploadedAt)
                .FirstOrDefaultAsync(ct);

            if (cvDocument == null)
            {
                return BadRequest(new
                {
                    message = "No CV has been uploaded yet - please upload your CV in the Documents step first."
                });
            }

            var extension = Path.GetExtension(cvDocument.OriginalFileName).ToLowerInvariant();
            if (extension != ".pdf")
            {
                // Gemini reads PDFs reliably; DOC/DOCX would need text extraction on
                // our side first before sending plain text instead of the raw file -
                // worth adding once PDF parsing is proven out in real use.
                return BadRequest(new
                {
                    message = $"AI auto-fill currently only supports PDF CVs (yours is a {extension} file). " +
                              "Upload a PDF version to use this feature, or fill in your details manually."
                });
            }

            // FileUrl is stored like "/Uploads/5/3f2a...pdf" - resolve it back to a
            // real path on disk the same way CandidateDocumentsController built it
            // when it wrote the file (ContentRootPath + relative path).
            var relativePath = cvDocument.FileUrl.TrimStart('/');
            var fullPath = Path.Combine(_env.ContentRootPath, relativePath.Replace('/', Path.DirectorySeparatorChar));

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound(new
                {
                    message = "Your uploaded CV file could not be found on the server - please re-upload it."
                });
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath, ct);

            try
            {
                var result = await _resumeParsingService.ParseAsync(fileBytes, "application/pdf", ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                // Covers: missing API key config, rate limit hit, Gemini call
                // failure, unparseable response. 502 because the failure is
                // with the upstream AI provider, not the request itself.
                return StatusCode(502, new { message = ex.Message });
            }
        }
    }
}