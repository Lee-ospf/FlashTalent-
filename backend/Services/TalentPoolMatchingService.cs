using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    // Thrown specifically for upstream AI-provider failures (network, rate
    // limit, malformed response) - kept distinct from InvalidOperationException
    // so the controller can tell "your request was invalid" (400) apart from
    // "the AI service failed" (502), same distinction ResumeParsingController
   
    public class AiProviderException : Exception
    {
        public AiProviderException(string message) : base(message) { }
    }

    public interface ITalentPoolMatchingService
    {
        Task<TalentPoolPullResponse> PullDraftSuggestionsAsync(int vacancyId, int changedByUserId, CancellationToken ct = default);
        Task<ApplicantRankingResponse> RankApplicantsAsync(int vacancyId, CancellationToken ct = default);
        Task<AiTalentPoolMatchResponse> InviteCandidateAsync(int vacancyId, int matchId, CancellationToken ct = default);
        Task<List<AiTalentPoolMatchResponse>> GetMatchesAsync(int vacancyId, TalentPoolMatchStage stage, CancellationToken ct = default);
        Task<TalentPoolInviteSummaryResponse> GetInviteSummaryAsync(int vacancyId, CancellationToken ct = default);
    }

    public class TalentPoolMatchingService : ITalentPoolMatchingService
    {
        private readonly AppDbContext _db;
        private readonly ITalentPoolService _talentPoolService;
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<TalentPoolMatchingService> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

        private const string ModelId = "gemini-3.5-flash-lite";

        private const int RecencyDays = 7;
        private const int MinScoreFloor = 50;
        private const int MaxDraftSuggestions = 5;

        private static readonly ApplicationStatus[] ActiveApplicationStatuses =
        {
        ApplicationStatus.Applied,
        //ApplicationStatus.UnderReview,
        //ApplicationStatus.Shortlisted,
        //ApplicationStatus.PrescreeningStage,
        //ApplicationStatus.InterviewStage,
       // ApplicationStatus.OfferExtended
    };

        public TalentPoolMatchingService(
            AppDbContext db,
            ITalentPoolService talentPoolService,
            HttpClient http,
            IConfiguration config,
            ILogger<TalentPoolMatchingService> logger)
        {
            _db = db;
            _talentPoolService = talentPoolService;
            _http = http;
            _config = config;
            _logger = logger;
        }

        // ========== Phase 1: talent pool draft suggestions ==========

        public async Task<TalentPoolPullResponse> PullDraftSuggestionsAsync(int vacancyId, int changedByUserId, CancellationToken ct = default)
        {
            var vacancy = await _db.Vacancies
                .Include(v => v.VacancySkills).ThenInclude(vs => vs.Skill)
                .FirstOrDefaultAsync(v => v.VacancyId == vacancyId, ct);

            if (vacancy == null)
                throw new KeyNotFoundException($"No vacancy found with VacancyId {vacancyId}.");

            // First pull moves Draft -> TalentPoolOnly. A second pull while
            // already TalentPoolOnly just refreshes matches - no further
            // transition needed.
            if (vacancy.Status != VacancyStatus.Draft && vacancy.Status != VacancyStatus.TalentPoolOnly)
                throw new InvalidOperationException("Talent pool suggestions can only be pulled while this vacancy is in Draft or Talent Pool Only status.");

            var requiredSkills = vacancy.VacancySkills.Where(vs => vs.IsRequired).ToList();
            if (requiredSkills.Count == 0)
                throw new InvalidOperationException("Add at least one required skill to this vacancy before pulling talent pool suggestions.");

            var wasDraft = vacancy.Status == VacancyStatus.Draft;

            var candidates = await _talentPoolService.GetEligibleCandidatesForAiMatchingAsync(vacancyId, RecencyDays);

            // Only clear PREVIOUS suggestions that were never invited - an invited
            // candidate's row is permanent history (who was reached out to, and
            // when), not a disposable suggestion. The eligibility query already
            // excludes already-invited candidates from being re-scored, so there's
            var previousUninvitedRows = await _db.TalentPoolMatches
                .Where(m => m.VacancyId == vacancyId
                         && m.Stage == TalentPoolMatchStage.DraftSuggestion
                         && m.InvitedAt == null)
                .ToListAsync(ct);
            _db.TalentPoolMatches.RemoveRange(previousUninvitedRows);

            vacancy.LastPoolPulledAt = DateTime.UtcNow;

            if (wasDraft)
            {
                vacancy.Status = VacancyStatus.TalentPoolOnly;
                _db.VacancyChangeHistories.Add(new VacancyChangeHistory
                {
                    VacancyId = vacancy.VacancyId,
                    VacancyTitle = vacancy.Title,
                    Action = "OpenedToTalentPool",
                    Details = "Status: Draft → TalentPoolOnly (opened to invited talent pool candidates via first talent pool pull)",
                    ChangedByUserId = changedByUserId,
                    ChangedAt = DateTime.UtcNow
                });
            }

            if (candidates.Count == 0)
            {
                await _db.SaveChangesAsync(ct);
                return new TalentPoolPullResponse
                {
                    VacancyId = vacancyId,
                    VacancyStatus = vacancy.Status.ToString(),
                    PulledAt = vacancy.LastPoolPulledAt.Value,
                    Matches = new List<AiTalentPoolMatchResponse>()
                };
            }

            var candidateProfiles = candidates.Select(BuildCandidateProfile).ToList();
            var vacancyProfile = BuildVacancyProfile(vacancy);

            var scored = await CallGeminiForScoringAsync(vacancyProfile, candidateProfiles, ct);
            var validScored = FilterToValidCandidateIds(scored, candidates.Select(c => c.CandidateId), vacancyId);

            var topMatches = validScored
                .Where(s => s.Score >= MinScoreFloor)
                .OrderByDescending(s => s.Score)
                .Take(MaxDraftSuggestions)
                .ToList();

            var candidateById = candidates.ToDictionary(c => c.CandidateId);
            var now = DateTime.UtcNow;

            var newRows = topMatches.Select(m => new TalentPoolMatch
            {
                VacancyId = vacancyId,
                CandidateId = m.CandidateId,
                Stage = TalentPoolMatchStage.DraftSuggestion,
                Score = m.Score,
                Reasoning = m.Reasoning,
                ComputedAt = now,
                ModelVersion = ModelId
            }).ToList();

            _db.TalentPoolMatches.AddRange(newRows);
            await _db.SaveChangesAsync(ct);

            return new TalentPoolPullResponse
            {
                VacancyId = vacancyId,
                VacancyStatus = vacancy.Status.ToString(),
                PulledAt = now,
                Matches = newRows.Select(r => MapToResponse(r, candidateById[r.CandidateId])).ToList()
            };
        }

        // Tracking view - every candidate ever invited for this vacancy (permanent
        // history, since invited rows are never deleted on re-pull), cross-
        // referenced against Applications to show who actually followed through.
        public async Task<TalentPoolInviteSummaryResponse> GetInviteSummaryAsync(int vacancyId, CancellationToken ct = default)
        {
            var invitedRows = await _db.TalentPoolMatches
                .Include(m => m.Candidate).ThenInclude(c => c!.User)
                .Where(m => m.VacancyId == vacancyId
                         && m.Stage == TalentPoolMatchStage.DraftSuggestion
                         && m.InvitedAt != null)
                .OrderByDescending(m => m.InvitedAt)
                .ToListAsync(ct);

            if (invitedRows.Count == 0)
            {
                return new TalentPoolInviteSummaryResponse { VacancyId = vacancyId };
            }

            var invitedCandidateIds = invitedRows.Select(m => m.CandidateId).ToList();

            var applications = await _db.Applications
                .Where(a => a.VacancyId == vacancyId && invitedCandidateIds.Contains(a.CandidateId))
                .ToDictionaryAsync(a => a.CandidateId, a => a.AppliedAt, ct);

            var invitees = invitedRows
                .Where(m => m.Candidate != null)
                .Select(m => new InvitedCandidateRow
                {
                    CandidateId = m.CandidateId,
                    CandidateName = FullName(m.Candidate!),
                    Score = m.Score,
                    InvitedAt = m.InvitedAt!.Value,
                    HasApplied = applications.ContainsKey(m.CandidateId),
                    AppliedAt = applications.TryGetValue(m.CandidateId, out var appliedAt) ? appliedAt : null
                })
                .ToList();

            return new TalentPoolInviteSummaryResponse
            {
                VacancyId = vacancyId,
                TotalInvited = invitees.Count,
                TotalApplied = invitees.Count(i => i.HasApplied),
                Invitees = invitees
            };
        }

        // ========== Phase 2: full applicant ranking ==========

        public async Task<ApplicantRankingResponse> RankApplicantsAsync(int vacancyId, CancellationToken ct = default)
        {
            var vacancy = await _db.Vacancies
                .Include(v => v.VacancySkills).ThenInclude(vs => vs.Skill)
                .FirstOrDefaultAsync(v => v.VacancyId == vacancyId, ct);

            if (vacancy == null)
                throw new KeyNotFoundException($"No vacancy found with VacancyId {vacancyId}.");

            // Allowing TalentPoolOnly too - a candidate who applied during that
            // phase (via invite) is a real applicant worth ranking even before
            // the recruiter has fully published the role.
            if (vacancy.Status != VacancyStatus.Published && vacancy.Status != VacancyStatus.TalentPoolOnly)
                throw new InvalidOperationException("Applicant ranking is only available once this vacancy is open (Talent Pool Only or Published).");

            var requiredSkills = vacancy.VacancySkills.Where(vs => vs.IsRequired).ToList();
            if (requiredSkills.Count == 0)
                throw new InvalidOperationException("This vacancy has no required skills to rank applicants against.");

            var applicantCandidateIds = await _db.Applications
     .Where(a => a.VacancyId == vacancyId && ActiveApplicationStatuses.Contains(a.Status))
     .Select(a => a.CandidateId)
     .ToListAsync(ct);

            var applicants = await _db.Candidates
                .Include(c => c.User)
                .Include(c => c.CandidateSkills).ThenInclude(cs => cs.Skill)
                .Include(c => c.Qualifications)
                .Include(c => c.Experiences)
                .Where(c => applicantCandidateIds.Contains(c.CandidateId))
                .ToListAsync(ct);

            var previousRankingRows = await _db.TalentPoolMatches
                .Where(m => m.VacancyId == vacancyId && m.Stage == TalentPoolMatchStage.FullRanking)
                .ToListAsync(ct);
            _db.TalentPoolMatches.RemoveRange(previousRankingRows);

            vacancy.LastApplicantRankedAt = DateTime.UtcNow;

            if (applicants.Count == 0)
            {
                await _db.SaveChangesAsync(ct);
                return new ApplicantRankingResponse
                {
                    VacancyId = vacancyId,
                    RankedAt = vacancy.LastApplicantRankedAt.Value,
                    Matches = new List<AiTalentPoolMatchResponse>()
                };
            }

            var candidateProfiles = applicants.Select(BuildCandidateProfile).ToList();
            var vacancyProfile = BuildVacancyProfile(vacancy);

            var scored = await CallGeminiForScoringAsync(vacancyProfile, candidateProfiles, ct);
            var validScored = FilterToValidCandidateIds(scored, applicants.Select(c => c.CandidateId), vacancyId);

            var ordered = validScored.OrderByDescending(s => s.Score).ToList();

            var candidateById = applicants.ToDictionary(c => c.CandidateId, c => c);
            var now = DateTime.UtcNow;

            var newRows = ordered.Select(m => new TalentPoolMatch
            {
                VacancyId = vacancyId,
                CandidateId = m.CandidateId,
                Stage = TalentPoolMatchStage.FullRanking,
                Score = m.Score,
                Reasoning = m.Reasoning,
                ComputedAt = now,
                ModelVersion = ModelId
            }).ToList();

            _db.TalentPoolMatches.AddRange(newRows);
            await _db.SaveChangesAsync(ct);

            return new ApplicantRankingResponse
            {
                VacancyId = vacancyId,
                RankedAt = now,
                Matches = newRows.Select(r => MapToResponse(r, candidateById[r.CandidateId])).ToList()
            };
        }

        // ========== Invite (Phase 1 action) ==========

        public async Task<AiTalentPoolMatchResponse> InviteCandidateAsync(int vacancyId, int matchId, CancellationToken ct = default)
        {
            var match = await _db.TalentPoolMatches
                .Include(m => m.Candidate).ThenInclude(c => c!.User)
                .Include(m => m.Vacancy)
                .FirstOrDefaultAsync(m => m.TalentPoolMatchId == matchId && m.VacancyId == vacancyId, ct);

            if (match == null)
                throw new KeyNotFoundException($"No talent pool match found with id {matchId} for vacancy {vacancyId}.");

            if (match.Stage != TalentPoolMatchStage.DraftSuggestion)
                throw new InvalidOperationException("Only talent pool suggestions can be invited - this row is a ranked applicant, who already has a real application to manage instead.");

            // In practice this is always TalentPoolOnly by the time Invite is
            // clickable (pulling always transitions the vacancy there first) -
            // this guard is defensive, in case of a direct API call.
            if (match.Vacancy?.Status != VacancyStatus.TalentPoolOnly && match.Vacancy?.Status != VacancyStatus.Published)
                throw new InvalidOperationException("This vacancy must be open to talent pool candidates or published before you can invite anyone.");

            if (match.InvitedAt.HasValue)
                throw new InvalidOperationException("This candidate has already been invited for this vacancy.");

            if (match.Candidate?.User == null)
                throw new InvalidOperationException("This candidate's account record is incomplete - cannot send an invite.");

            match.InvitedAt = DateTime.UtcNow;

            _db.Notifications.Add(new Notification
            {
                UserId = match.Candidate.User.UserId,
                NotificationType = NotificationType.TalentPoolInvite,
                Subject = $"You've been invited to apply: {match.Vacancy?.Title ?? "a new role"}",
                Body = $"Based on your profile, a recruiter thinks you could be a great fit for \"{match.Vacancy?.Title}\". " +
                       "If you're interested, view the role below and submit an application - this invite doesn't apply on your behalf.",
                ActionUrl = $"/vacancies/{vacancyId}",
                SentAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(ct);

            return MapToResponse(match, match.Candidate);
        }

        // ========== Read-only ==========

        public async Task<List<AiTalentPoolMatchResponse>> GetMatchesAsync(int vacancyId, TalentPoolMatchStage stage, CancellationToken ct = default)
        {
            var rows = await _db.TalentPoolMatches
                .Include(m => m.Candidate).ThenInclude(c => c!.User)
                .Where(m => m.VacancyId == vacancyId && m.Stage == stage)
                .OrderByDescending(m => m.Score)
                .ToListAsync(ct);

            return rows
                .Where(r => r.Candidate != null)
                .Select(r => MapToResponse(r, r.Candidate!))
                .ToList();
        }

        // ========== Shared helpers ==========

        private static AiTalentPoolMatchResponse MapToResponse(TalentPoolMatch row, Candidate candidate)
        {
            return new AiTalentPoolMatchResponse
            {
                TalentPoolMatchId = row.TalentPoolMatchId,
                CandidateId = row.CandidateId,
                CandidateName = FullName(candidate),
                CandidateEmail = candidate.User?.Email,
                Score = row.Score,
                Reasoning = row.Reasoning,
                InvitedAt = row.InvitedAt,
                ComputedAt = row.ComputedAt
            };
        }

        private List<AiScoreResult> FilterToValidCandidateIds(List<AiScoreResult> scored, IEnumerable<int> sentCandidateIds, int vacancyId)
        {
            var validIds = sentCandidateIds.ToHashSet();
            var valid = scored.Where(s => validIds.Contains(s.CandidateId)).ToList();

            var missing = validIds.Except(valid.Select(s => s.CandidateId)).ToList();
            if (missing.Count > 0)
            {
                _logger.LogWarning(
                    "Gemini omitted {Count} candidate(s) from its scored response for vacancy {VacancyId}: {Ids}",
                    missing.Count, vacancyId, string.Join(",", missing));
            }

            return valid;
        }

        private CandidateProfileForPrompt BuildCandidateProfile(Candidate c)
        {
            return new CandidateProfileForPrompt
            {
                CandidateId = c.CandidateId,
                Skills = c.CandidateSkills
                    .Where(cs => cs.Skill != null)
                    .Select(cs => new SkillForPrompt
                    {
                        Name = cs.Skill!.Name,
                        Category = cs.Skill.Category.ToString(),
                        ProficiencyLevel = cs.ProficiencyLevel.ToString()
                    }).ToList(),
                Qualifications = c.Qualifications
                    .Select(q => new QualificationForPrompt
                    {
                        Type = q.QualificationType.ToString(),
                        Name = q.Name,
                        Institution = q.Institution
                    }).ToList(),
                YearsOfExperience = CalculateYearsOfExperience(c.Experiences)
            };
        }

        private static VacancyProfileForPrompt BuildVacancyProfile(Vacancy v)
        {
            return new VacancyProfileForPrompt
            {
                Title = v.Title,
                Description = v.Description,
                RequiredQualifications = v.RequiredQualifications,
                Requirements = v.Requirements,
                MinYearsExperience = v.MinYearsExperience,
                // ALL skills now, not just required ones - preferred skills (often
                // where soft skills like "Communication" or "Leadership" live) were
                // previously dropped entirely because only IsRequired == true made
                // it through. IsRequired is now carried per-skill so the AI can
                // still weigh them differently.
                Skills = v.VacancySkills.Where(vs => vs.Skill != null).Select(vs => new SkillForPrompt
                {
                    Name = vs.Skill!.Name,
                    Category = vs.Skill.Category.ToString(),
                    ProficiencyLevel = vs.ProficiencyLevel,
                    IsRequired = vs.IsRequired
                }).ToList()
            };
        }

        internal static double CalculateYearsOfExperience(IEnumerable<CandidateExperience> experiences)
        {
            var now = DateTime.UtcNow.Date;

            var ranges = experiences
                .Select(e => (Start: e.StartDate.Date, End: (e.EndDate ?? now).Date))
                .Where(r => r.End > r.Start)
                .OrderBy(r => r.Start)
                .ToList();

            if (ranges.Count == 0) return 0;

            var mergedDays = 0.0;
            var currentStart = ranges[0].Start;
            var currentEnd = ranges[0].End;

            for (int i = 1; i < ranges.Count; i++)
            {
                var (start, end) = ranges[i];
                if (start <= currentEnd)
                {
                    if (end > currentEnd) currentEnd = end;
                }
                else
                {
                    mergedDays += (currentEnd - currentStart).TotalDays;
                    currentStart = start;
                    currentEnd = end;
                }
            }
            mergedDays += (currentEnd - currentStart).TotalDays;

            return Math.Round(mergedDays / 365.25, 1);
        }

        private static string FullName(Candidate c) =>
            c.User != null ? $"{c.User.FirstName} {c.User.LastName}" : "Unknown";

        // ========== Gemini call ==========

        private async Task<List<AiScoreResult>> CallGeminiForScoringAsync(
            VacancyProfileForPrompt vacancy, List<CandidateProfileForPrompt> candidates, CancellationToken ct)
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new AiProviderException("Gemini:ApiKey is not configured in appsettings.json.");

            var promptText = BuildScoringPrompt(vacancy, candidates);

            var requestBody = new
            {
                contents = new[]
                {
                new { parts = new object[] { new { text = promptText } } }
            },
                generationConfig = new
                {
                    response_mime_type = "application/json",
                    temperature = 0
                }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:generateContent?key={apiKey}";

            HttpResponseMessage response;
            try
            {
                response = await _http.PostAsJsonAsync(url, requestBody, JsonOpts, ct);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Gemini for talent pool matching.");
                throw new AiProviderException("Couldn't reach the AI service - please try again shortly.");
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Gemini rate limit hit (free tier: 500 requests/day for {Model}).", ModelId);
                throw new AiProviderException("AI matching has hit today's usage limit - please try again tomorrow.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini talent pool scoring failed: {Status} {Body}", response.StatusCode, errorBody);
                throw new AiProviderException("The AI matching request failed - please try again shortly.");
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            var geminiResponse = JsonSerializer.Deserialize<GeminiGenerateContentResponse>(raw, JsonOpts);

            var jsonText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(jsonText))
            {
                _logger.LogWarning("Gemini returned no extractable text for talent pool matching. Raw response: {Raw}", raw);
                throw new AiProviderException("The AI didn't return a usable result - please try again shortly.");
            }

            jsonText = StripMarkdownFences(jsonText);

            try
            {
                return JsonSerializer.Deserialize<List<AiScoreResult>>(jsonText, JsonOpts) ?? new List<AiScoreResult>();
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Gemini returned malformed JSON for talent pool matching: {JsonText}", jsonText);
                throw new AiProviderException("The AI's response couldn't be understood - please try again shortly.");
            }
        }

        private static string BuildScoringPrompt(VacancyProfileForPrompt vacancy, List<CandidateProfileForPrompt> candidates)
        {
            var vacancyJson = JsonSerializer.Serialize(vacancy, JsonOpts);
            var candidatesJson = JsonSerializer.Serialize(candidates, JsonOpts);

            return $$"""
        You are scoring how well candidates match a job vacancy for a recruitment system.
        Compare each candidate against the vacancy and return ONLY a JSON array (no markdown,
        no commentary, no explanation) with exactly this shape, one entry per candidate:

        [
          { "candidateId": number, "score": number (0-100), "reasoning": string }
        ]

        Rules:
        - Score every candidate provided below - do not omit any, and do not invent a
          candidateId that isn't in the input.
        - Use the vacancy's "description" field as context alongside "requirements" and
          "requiredQualifications" - it often describes the actual day-to-day work and can
          imply relevant skills or experience that aren't listed as formal vacancy skills.
        - "score" reflects overall fit: skill overlap with the vacancy's skills list (weighted
          more if the candidate's proficiency meets or exceeds what's asked), whether
          yearsOfExperience meets the vacancy's minYearsExperience, and whether qualifications
          are reasonably relevant to requiredQualifications/requirements/description.
        - Within the vacancy's skills list, isRequired: true skills matter most - a candidate
          missing several of these should score low (well under 50), not be padded upward.
          isRequired: false (preferred) skills, including soft skills (category: SoftSkill),
          should boost a candidate's score when present but must NEVER be treated as a
          disqualifying gap when absent - a candidate should not be penalized merely for
          lacking a soft skill or preferred skill that wasn't explicitly required.
        - A candidate's soft skills matching language in the vacancy's description (e.g. a
          description mentioning teamwork, leadership, or client communication) should
          contribute positively to the score, treated the same as a matched preferred skill.
        - A candidate missing several required skills or falling well short of
          minYearsExperience should score low (well under 50), not be padded upward to
          seem like a reasonable option.
        - "reasoning" must be ONE short sentence (under 30 words) explaining the score -
          concrete and specific (e.g. name the matched/missing skills), not generic praise.
        - Return valid JSON only - it will be parsed programmatically, no extra text before
          or after it.

        VACANCY:
        {{vacancyJson}}

        CANDIDATES:
        {{candidatesJson}}
        """;
        }

        private static string StripMarkdownFences(string text)
        {
            text = text.Trim();
            if (!text.StartsWith("```"))
                return text;

            var firstNewline = text.IndexOf('\n');
            var lastFence = text.LastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline)
                text = text[(firstNewline + 1)..lastFence].Trim();

            return text;
        }

        private class VacancyProfileForPrompt
        {
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;   // NEW
            public string RequiredQualifications { get; set; } = string.Empty;
            public string Requirements { get; set; } = string.Empty;
            public int? MinYearsExperience { get; set; }
            public List<SkillForPrompt> Skills { get; set; } = new();
        }

        private class CandidateProfileForPrompt
        {
            public int CandidateId { get; set; }
            public List<SkillForPrompt> Skills { get; set; } = new();
            public List<QualificationForPrompt> Qualifications { get; set; } = new();
            public double YearsOfExperience { get; set; }
        }

        private class SkillForPrompt
        {
            public string Name { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string ProficiencyLevel { get; set; } = string.Empty;
            public bool IsRequired { get; set; }
        }

        private class QualificationForPrompt
        {
            public string Type { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string Institution { get; set; } = string.Empty;
        }

        private class AiScoreResult
        {
            public int CandidateId { get; set; }
            public int Score { get; set; }
            public string Reasoning { get; set; } = string.Empty;
        }

        private class GeminiGenerateContentResponse
        {
            [JsonPropertyName("candidates")]
            public List<GeminiCandidate>? Candidates { get; set; }
        }

        private class GeminiCandidate
        {
            [JsonPropertyName("content")]
            public GeminiContent? Content { get; set; }
        }

        private class GeminiContent
        {
            [JsonPropertyName("parts")]
            public List<GeminiPart>? Parts { get; set; }
        }

        private class GeminiPart
        {
            [JsonPropertyName("text")]
            public string? Text { get; set; }
        }
    }
}