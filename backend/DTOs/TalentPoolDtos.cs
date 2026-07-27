namespace TalentHub.DTOs
{
    // Returned by GET api/talentpool/matches/{vacancyId}
    public class TalentPoolMatchResponse
    {
        public int TalentPoolId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public string? CandidateEmail { get; set; }
        public List<string> MatchedSkills { get; set; } = new();
        public int? LastVacancyId { get; set; }
        public string? LastVacancyTitle { get; set; }
        public DateTime AddedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    // Returned by GET api/talentpool (full pool listing)
    public class TalentPoolEntryResponse
    {
        public int TalentPoolId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int? LastVacancyId { get; set; }
        public string? LastVacancyTitle { get; set; }
        public DateTime AddedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}