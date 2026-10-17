using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/documents")]
    [Authorize(Roles = "HR,Admin")]
    public class ProjectDocumentsController : TalentHubControllerBase
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
        private const int MaxFilesPerProject = 10;
        private static readonly string[] AllowedExtensions = { ".pdf", ".docx" };

        private readonly IWebHostEnvironment _env;

        public ProjectDocumentsController(AppDbContext db, IWebHostEnvironment env) : base(db)
        {
            _env = env;
        }

        private string FolderFor(int projectId) =>
            Path.Combine(_env.ContentRootPath, "App_Data", "ProjectFiles", projectId.ToString());

        // GET api/projects/{projectId}/documents
        [HttpGet]
        public async Task<ActionResult<List<ProjectDocumentResponse>>> GetAll(int projectId)
        {
            if (!await Db.Projects.AnyAsync(p => p.ProjectId == projectId))
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            var docs = await Db.ProjectDocuments.AsNoTracking()
                .Where(d => d.ProjectId == projectId)
                .OrderByDescending(d => d.UploadedAt)
                .Select(d => new ProjectDocumentResponse
                {
                    ProjectDocumentId = d.ProjectDocumentId,
                    FileName = d.OriginalFileName,
                    SizeBytes = d.SizeBytes,
                    UploadedByName = d.UploadedByUser!.FirstName + " " + d.UploadedByUser.LastName,
                    UploadedAt = d.UploadedAt
                })
                .ToListAsync();

            return Ok(docs);
        }

        // POST api/projects/{projectId}/documents  (multipart/form-data, field: file)
        [HttpPost]
        [RequestSizeLimit(MaxFileSizeBytes + 1024)]
        public async Task<ActionResult<ProjectDocumentResponse>> Upload(int projectId, IFormFile file, CancellationToken ct)
        {
            var project = await Db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.ProjectId == projectId, ct);
            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "Files can't be added to a closed project." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file was uploaded." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = $"File exceeds the maximum size of {MaxFileSizeBytes / (1024 * 1024)} MB." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                return BadRequest(new { message = "Only PDF and Word (.docx) files are accepted." });

            if (await Db.ProjectDocuments.CountAsync(d => d.ProjectId == projectId, ct) >= MaxFilesPerProject)
                return BadRequest(new { message = $"A project can have at most {MaxFilesPerProject} files." });

            // Check the real content, not just the file name
            byte[] header = new byte[4];
            await using (var s = file.OpenReadStream())
            {
                var read = await s.ReadAsync(header, 0, 4, ct);
                if (read < 4) return BadRequest(new { message = "The file is too small to be valid." });
            }
            var looksLikePdf = header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46;
            var looksLikeZip = header[0] == 0x50 && header[1] == 0x4B;
            if ((extension == ".pdf" && !looksLikePdf) || (extension == ".docx" && !looksLikeZip))
                return BadRequest(new { message = "The file content doesn't match its extension." });

            var folder = FolderFor(projectId);
            Directory.CreateDirectory(folder);

            var storedName = $"{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(folder, storedName);

            await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream, ct);
            }

            var doc = new ProjectDocument
            {
                ProjectId = projectId,
                OriginalFileName = Path.GetFileName(file.FileName),
                StoredFileName = storedName,
                ContentType = extension == ".pdf"
                    ? "application/pdf"
                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                SizeBytes = file.Length,
                UploadedByUserId = CurrentUserId,
                UploadedAt = DateTime.UtcNow
            };

            try
            {
                Db.ProjectDocuments.Add(doc);
                await Db.SaveChangesAsync(ct);
            }
            catch
            {
                // Don't leave an orphan file behind if the database save fails
                System.IO.File.Delete(fullPath);
                throw;
            }

            var uploader = await Db.Users.AsNoTracking().FirstAsync(u => u.UserId == CurrentUserId, ct);

            return Ok(new ProjectDocumentResponse
            {
                ProjectDocumentId = doc.ProjectDocumentId,
                FileName = doc.OriginalFileName,
                SizeBytes = doc.SizeBytes,
                UploadedByName = $"{uploader.FirstName} {uploader.LastName}",
                UploadedAt = doc.UploadedAt
            });
        }

        // GET api/projects/{projectId}/documents/{documentId}
        [HttpGet("{documentId:int}")]
        public async Task<IActionResult> Download(int projectId, int documentId)
        {
            var doc = await Db.ProjectDocuments.AsNoTracking()
                .FirstOrDefaultAsync(d => d.ProjectDocumentId == documentId && d.ProjectId == projectId);
            if (doc == null)
                return NotFound(new { message = "No such file on this project." });

            var fullPath = Path.Combine(FolderFor(projectId), doc.StoredFileName);
            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { message = "The file could not be found on the server." });

            return PhysicalFile(fullPath, doc.ContentType, doc.OriginalFileName);
        }

        // DELETE api/projects/{projectId}/documents/{documentId}
        [HttpDelete("{documentId:int}")]
        public async Task<IActionResult> Delete(int projectId, int documentId)
        {
            var project = await Db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.ProjectId == projectId);
            if (project == null)
                return NotFound(new { message = $"No project found with ProjectId {projectId}." });

            if (project.Status == ProjectStatus.Closed)
                return BadRequest(new { message = "A closed project's files can't be changed." });

            var doc = await Db.ProjectDocuments
                .FirstOrDefaultAsync(d => d.ProjectDocumentId == documentId && d.ProjectId == projectId);
            if (doc == null)
                return NotFound(new { message = "No such file on this project." });

            var fullPath = Path.Combine(FolderFor(projectId), doc.StoredFileName);

            Db.ProjectDocuments.Remove(doc);
            await Db.SaveChangesAsync();

            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            return NoContent();
        }
    }
}