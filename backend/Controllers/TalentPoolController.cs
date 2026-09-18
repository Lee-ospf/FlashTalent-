using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Recruiter,Admin")]
    public class TalentPoolController : TalentHubControllerBase
    {
        private readonly ITalentPoolService _talentPoolService;
        private readonly ITalentPoolMatchingService _matchingService;

        public TalentPoolController(
            AppDbContext db,
            ITalentPoolService talentPoolService,
            ITalentPoolMatchingService matchingService) : base(db)
        {
            _talentPoolService = talentPoolService;
            _matchingService = matchingService;
        }

        // GET api/talentpool
        // Full pool listing - recruiter/admin browsing view.
        [HttpGet]
        public async Task<ActionResult<List<TalentPoolEntryResponse>>> GetAll()
        {
            var result = await _talentPoolService.GetAllAsync();
            return Ok(result);
        }


        // GET api/talentpool/{vacancyId}/invite-summary
        // Tracking view: everyone ever invited for this vacancy, and whether they
        // went on to apply. Permanent history - survives re-pulls.
        [HttpGet("{vacancyId}/invite-summary")]
        public async Task<ActionResult<TalentPoolInviteSummaryResponse>> GetInviteSummary(int vacancyId)
        {
            var result = await _matchingService.GetInviteSummaryAsync(vacancyId);
            return Ok(result);
        }

        // GET api/talentpool/matches/{vacancyId}
        // Candidates in the pool whose skills overlap with this vacancy's required skills.
        // Deterministic, no AI - unchanged.
        [HttpGet("matches/{vacancyId}")]
        public async Task<ActionResult<List<TalentPoolMatchResponse>>> GetMatches(int vacancyId)
        {
            var vacancy = await Db.Vacancies.FindAsync(vacancyId);
            if (vacancy == null)
            {
                return NotFound(new { message = $"No vacancy found with VacancyId {vacancyId}." });
            }

            var matches = await _talentPoolService.GetMatchesForVacancyAsync(vacancyId);
            return Ok(matches);
        }

        // POST api/talentpool/{vacancyId}/pull
        // Phase 1 - AI-scores eligible talent pool candidates against this
        // (Draft) vacancy, keeps only those scoring >= 50, caps at top 5, and
        // persists them as DraftSuggestion rows. Manually triggered by the
        // recruiter; re-clicking replaces the previous batch for this vacancy.
        [HttpPost("{vacancyId}/pull")]
        public async Task<ActionResult<TalentPoolPullResponse>> PullDraftSuggestions(int vacancyId, CancellationToken ct)
        {
            try
            {
                var result = await _matchingService.PullDraftSuggestionsAsync(vacancyId, CurrentUserId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (AiProviderException ex)
            {
                return StatusCode(502, new { message = ex.Message });
            }
        }

        // POST api/talentpool/{vacancyId}/rank-applicants
        // Phase 2 - AI-scores everyone currently in the active pipeline for
        // this (Published) vacancy, no floor/cap - a full ranked list, not a
        // shortlist. Manually triggered; re-clicking replaces the previous
        // ranking for this vacancy.
        [HttpPost("{vacancyId}/rank-applicants")]
        public async Task<ActionResult<ApplicantRankingResponse>> RankApplicants(int vacancyId, CancellationToken ct)
        {
            try
            {
                var result = await _matchingService.RankApplicantsAsync(vacancyId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (AiProviderException ex)
            {
                return StatusCode(502, new { message = ex.Message });
            }
        }

        // GET api/talentpool/{vacancyId}/ai-matches?stage=DraftSuggestion
        // Reload either phase's persisted results without re-running AI -
        // e.g. navigating back to a vacancy after already pulling/ranking.
        [HttpGet("{vacancyId}/ai-matches")]
        public async Task<ActionResult<List<AiTalentPoolMatchResponse>>> GetAiMatches(
            int vacancyId, [FromQuery] string stage)
        {
            if (!Enum.TryParse<TalentPoolMatchStage>(stage, true, out var parsedStage))
            {
                var validValues = string.Join(", ", Enum.GetNames(typeof(TalentPoolMatchStage)));
                return BadRequest(new { message = $"Invalid stage '{stage}'. Valid values: {validValues}." });
            }

            var result = await _matchingService.GetMatchesAsync(vacancyId, parsedStage);
            return Ok(result);
        }

        // POST api/talentpool/{vacancyId}/matches/{matchId}/invite
        // Phase 1 action - notifies a suggested candidate they may want to
        // apply. Does NOT create an Application - the candidate still has to
        // actually apply themselves if interested.
        [HttpPost("{vacancyId}/matches/{matchId}/invite")]
        public async Task<ActionResult<AiTalentPoolMatchResponse>> InviteCandidate(int vacancyId, int matchId, CancellationToken ct)
        {
            try
            {
                var result = await _matchingService.InviteCandidateAsync(vacancyId, matchId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}