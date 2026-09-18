using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface ITalentPoolService
    {
        Task AddOrUpdateAsync(int candidateId, int vacancyId);
        Task<List<TalentPoolMatchResponse>> GetMatchesForVacancyAsync(int vacancyId);
        Task<List<TalentPoolEntryResponse>> GetAllAsync();

       
        Task<List<Candidate>> GetEligibleCandidatesForAiMatchingAsync(int vacancyId, int recencyDays);
    }

    public class TalentPoolService : ITalentPoolService
    {
        private readonly AppDbContext _db;

        public TalentPoolService(AppDbContext db)
        {
            _db = db;
        }

        public async Task AddOrUpdateAsync(int candidateId, int vacancyId)
        {
            // TalentPool.CandidateId is unique (see AppDbContext), so a candidate
            // can only ever have one entry - if they're rejected again later from
            // a different vacancy, we just refresh the existing row instead of
            // inserting a duplicate.
            var existing = await _db.TalentPoolEntries
                .FirstOrDefaultAsync(t => t.CandidateId == candidateId);

            if (existing == null)
            {
                _db.TalentPoolEntries.Add(new TalentPool
                {
                    CandidateId = candidateId,
                    LastVacancyId = vacancyId,
                    AddedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.LastVacancyId = vacancyId;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        // Candidates who already have ANY application record against THIS
        // vacancy, OR who are anywhere in an ACTIVE pipeline (any status other
        // than NotSelected) for a DIFFERENT vacancy - shared by both the
        // deterministic matcher and the AI eligibility query below, so the two
        // never drift out of sync on what "eligible" means.
        private async Task<HashSet<int>> GetExcludedCandidateIdsAsync(int vacancyId)
        {
            var alreadyInThisVacancyPipeline = await _db.Applications
                .Where(a => a.VacancyId == vacancyId)
                .Select(a => a.CandidateId)
                .ToListAsync();

            var ineligibleElsewhere = await _db.Applications
                .Where(a => a.Status != ApplicationStatus.NotSelected)
                .Select(a => a.CandidateId)
                .ToListAsync();

            return alreadyInThisVacancyPipeline
                .Concat(ineligibleElsewhere)
                .Distinct()
                .ToHashSet();
        }

        public async Task<List<TalentPoolMatchResponse>> GetMatchesForVacancyAsync(int vacancyId)
        {
            var vacancy = await _db.Vacancies.FindAsync(vacancyId);
            if (vacancy == null)
            {
                return new List<TalentPoolMatchResponse>();
            }

            var requiredSkillIds = await _db.Set<VacancySkill>()
                .Where(vs => vs.VacancyId == vacancyId && vs.IsRequired)
                .Select(vs => vs.SkillId)
                .ToListAsync();

            if (requiredSkillIds.Count == 0)
            {
                return new List<TalentPoolMatchResponse>();
            }

            var excludedCandidateIds = await GetExcludedCandidateIdsAsync(vacancyId);

            var poolEntries = await _db.TalentPoolEntries
                .Include(t => t.Candidate).ThenInclude(c => c!.User)
                .Include(t => t.Candidate).ThenInclude(c => c!.CandidateSkills).ThenInclude(cs => cs.Skill)
                .Include(t => t.LastVacancy)
                .Where(t => !excludedCandidateIds.Contains(t.CandidateId))
                .ToListAsync();

            var results = new List<TalentPoolMatchResponse>();

            foreach (var entry in poolEntries)
            {
                if (entry.Candidate == null) continue;

                var matchedSkills = entry.Candidate.CandidateSkills
                    .Where(cs => requiredSkillIds.Contains(cs.SkillId))
                    .Select(cs => cs.Skill!.Name)
                    .Distinct()
                    .ToList();

                if (matchedSkills.Count == 0) continue; // no overlap - not a match

                results.Add(new TalentPoolMatchResponse
                {
                    TalentPoolId = entry.TalentPoolId,
                    CandidateId = entry.CandidateId,
                    CandidateName = entry.Candidate.User != null
                        ? $"{entry.Candidate.User.FirstName} {entry.Candidate.User.LastName}"
                        : "Unknown",
                    CandidateEmail = entry.Candidate.User?.Email,
                    MatchedSkills = matchedSkills,
                    LastVacancyId = entry.LastVacancyId,
                    LastVacancyTitle = entry.LastVacancy?.Title,
                    AddedAt = entry.AddedAt,
                    UpdatedAt = entry.UpdatedAt
                });
            }

            return results
                .OrderByDescending(r => r.MatchedSkills.Count)
                .ToList();
        }

        public async Task<List<TalentPoolEntryResponse>> GetAllAsync()
        {
            var entries = await _db.TalentPoolEntries
                .Include(t => t.Candidate).ThenInclude(c => c!.User)
                .Include(t => t.LastVacancy)
                .OrderByDescending(t => t.AddedAt)
                .ToListAsync();

            return entries
                .Where(t => t.Candidate != null)
                .Select(t => new TalentPoolEntryResponse
                {
                    TalentPoolId = t.TalentPoolId,
                    CandidateId = t.CandidateId,
                    CandidateName = t.Candidate!.User != null
                        ? $"{t.Candidate.User.FirstName} {t.Candidate.User.LastName}"
                        : "Unknown",
                    LastVacancyId = t.LastVacancyId,
                    LastVacancyTitle = t.LastVacancy?.Title,
                    AddedAt = t.AddedAt,
                    UpdatedAt = t.UpdatedAt
                })
                .ToList();
        }

        public async Task<List<Candidate>> GetEligibleCandidatesForAiMatchingAsync(int vacancyId, int recencyDays)
        {
            var excludedCandidateIds = await GetExcludedCandidateIdsAsync(vacancyId);
            var cutoff = DateTime.UtcNow.AddDays(-recencyDays);

            // Anyone already invited for THIS vacancy shouldn't be re-suggested on
            // a later pull - they've already been reached out to, and re-showing
            // them (even after Invite is no longer clickable, since InvitedAt is
            // set) would just be noise.
            var alreadyInvitedForThisVacancy = await _db.TalentPoolMatches
                .Where(m => m.VacancyId == vacancyId
                         && m.Stage == TalentPoolMatchStage.DraftSuggestion
                         && m.InvitedAt != null)
                .Select(m => m.CandidateId)
                .ToListAsync();

            var poolCandidateIds = await _db.TalentPoolEntries
                .Select(t => t.CandidateId)
                .ToListAsync();

            var eligibleIds = poolCandidateIds
                .Except(excludedCandidateIds)
                .Except(alreadyInvitedForThisVacancy)
                .ToHashSet();

            if (eligibleIds.Count == 0)
            {
                return new List<Candidate>();
            }

            return await _db.Candidates
                .Include(c => c.User)
                .Include(c => c.CandidateSkills).ThenInclude(cs => cs.Skill)
                .Include(c => c.Qualifications)
                .Include(c => c.Experiences)
                .Where(c => eligibleIds.Contains(c.CandidateId) && c.LastProfileUpdateAt >= cutoff)
                .ToListAsync();
        }
    }
}