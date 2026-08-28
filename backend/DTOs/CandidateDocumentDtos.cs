namespace TalentHub.DTOs
{
    public class CandidateDocumentResponse
    {
        public int CandidateDocumentId { get; set; }
        public int CandidateId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public int? QualificationId { get; set; }
    }

    public class MandatoryDocumentsStatusResponse
    {
        public int CandidateId { get; set; }
        public bool HasCv { get; set; }
        public bool HasMatricCertificate { get; set; }
        public bool AllMandatoryDocumentsPresent { get; set; }
        public List<string> MissingDocumentTypes { get; set; } = new();
    }
}