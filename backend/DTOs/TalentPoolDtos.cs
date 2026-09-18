namespace TalentHub.DTOs
{
    // Returned by GET api/talentpool/matches/{vacancyId}
    // (existing, deterministic skill-overlap matcher - unchanged)
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
    // (existing, unchanged)
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

    // ---------- AI-scored matching (new) ----------

    // One AI-scored candidate row - used for both Phase 1 (DraftSuggestion,
    // InvitedAt meaningful) and Phase 2 (FullRanking, InvitedAt always null).
    public class AiTalentPoolMatchResponse
    {
        public int TalentPoolMatchId { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public string? CandidateEmail { get; set; }
        public int Score { get; set; }
        public string Reasoning { get; set; } = string.Empty;
        public DateTime? InvitedAt { get; set; }
        public DateTime ComputedAt { get; set; }
    }

    // Returned by POST api/talentpool/{vacancyId}/pull (Phase 1)
    // Wraps the match list with the vacancy/timestamp context the frontend
    // needs to render "Talent pool last pulled just now" without a second call.
    public class TalentPoolPullResponse
    {
        public int VacancyId { get; set; }
        public string VacancyStatus { get; set; } = string.Empty;
        public DateTime PulledAt { get; set; }
        public List<AiTalentPoolMatchResponse> Matches { get; set; } = new();
    }

    public class TalentPoolInviteSummaryResponse
    {
        public int VacancyId { get; set; }
        public int TotalInvited { get; set; }
        public int TotalApplied { get; set; }   // how many of the invited candidates went on to actually apply
        public List<InvitedCandidateRow> Invitees { get; set; } = new();
    }

    public class InvitedCandidateRow
    {
        public int CandidateId { get; set; }
        public string CandidateName { get; set; } = string.Empty;
        public int Score { get; set; }
        public DateTime InvitedAt { get; set; }
        public bool HasApplied { get; set; }
        public DateTime? AppliedAt { get; set; }
    }


    public class ApplicantRankingResponse
    {
        public int VacancyId { get; set; }
        public DateTime RankedAt { get; set; }
        public List<AiTalentPoolMatchResponse> Matches { get; set; } = new();
    }
}