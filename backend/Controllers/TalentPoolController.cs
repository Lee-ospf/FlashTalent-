using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Recruiter,Admin")]
    public class TalentPoolController : TalentHubControllerBase
    {
        private readonly ITalentPoolService _talentPoolService;

        public TalentPoolController(AppDbContext db, ITalentPoolService talentPoolService) : base(db)
        {
            _talentPoolService = talentPoolService;
        }

        // GET api/talentpool
        // Full pool listing - recruiter/admin browsing view.
        [HttpGet]
        public async Task<ActionResult<List<TalentPoolEntryResponse>>> GetAll()
        {
            var result = await _talentPoolService.GetAllAsync();
            return Ok(result);
        }

        // GET api/talentpool/matches/{vacancyId}
        // Candidates in the pool whose skills overlap with this vacancy's required skills.
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
    }
}