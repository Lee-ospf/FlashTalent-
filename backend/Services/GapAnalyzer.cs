using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public record GapSkillRequirement(int SkillId, string SkillName, bool IsRequired, ProficiencyLevel MinimumLevel);
    public record GapEmployeeSkill(int SkillId, string SkillName, ProficiencyLevel Level);

    // Pure rules: no database, no AI. Same input always gives the same output.
    public static class GapAnalyzer
    {
        public static GapAnalysisResult Analyze(
            IEnumerable<GapSkillRequirement> requirements,
            IEnumerable<GapEmployeeSkill> employeeSkills)
        {
            var reqList = requirements.ToList();

            // One entry per skill (the DB enforces this, but stay safe): keep the highest level
            var held = employeeSkills
                .GroupBy(s => s.SkillId)
                .Select(g => g.OrderByDescending(s => s.Level).First())
                .ToDictionary(s => s.SkillId);

            var items = reqList.Select(r =>
            {
                var item = new SkillGapItem
                {
                    SkillId = r.SkillId,
                    SkillName = r.SkillName,
                    IsRequired = r.IsRequired,
                    RequiredLevel = r.MinimumLevel
                };

                if (!held.TryGetValue(r.SkillId, out var h))
                {
                    item.Status = GapStatus.Missing;
                }
                else
                {
                    item.EmployeeLevel = h.Level;
                    item.Status = h.Level >= r.MinimumLevel ? GapStatus.Met : GapStatus.BelowLevel;
                }
                return item;
            })
            .OrderByDescending(i => i.IsRequired)
            .ThenByDescending(i => i.Status)      // Missing, then BelowLevel, then Met
            .ThenBy(i => i.SkillName)
            .ToList();

            var requiredIds = reqList.Select(r => r.SkillId).ToHashSet();
            var extras = held.Values
                .Where(h => !requiredIds.Contains(h.SkillId))
                .OrderBy(h => h.SkillName)
                .Select(h => new ExtraSkillItem { SkillId = h.SkillId, SkillName = h.SkillName, Level = h.Level })
                .ToList();

            var required = items.Where(i => i.IsRequired).ToList();
            var niceToHave = items.Where(i => !i.IsRequired).ToList();

            return new GapAnalysisResult
            {
                Skills = items,
                ExtraSkills = extras,
                RequiredTotal = required.Count,
                RequiredMet = required.Count(i => i.Status == GapStatus.Met),
                NiceToHaveTotal = niceToHave.Count,
                NiceToHaveMet = niceToHave.Count(i => i.Status == GapStatus.Met),
                MeetsAllRequiredSkills = required.All(i => i.Status == GapStatus.Met)
            };
        }
    }
}