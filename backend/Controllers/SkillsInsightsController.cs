using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Read-only data for the management screens: directory, matrix, heatmap and reports.
    // HR and Admin only. No AI is called here, and nothing is changed.
    // Under about 2,000 employees, so the bulk endpoints are not paged.
    [ApiController]
    [Route("api/insights")]
    [Authorize(Roles = "HR,Admin")]
    public class SkillsInsightsController : TalentHubControllerBase
    {
        public SkillsInsightsController(AppDbContext db) : base(db) { }

        // GET api/insights/employee-skills?departmentId=3
        // One call feeds the directory, the matrix and the heatmap, so their numbers always agree.
        [HttpGet("employee-skills")]
        public async Task<ActionResult<InsightEmployeeSkillsResponse>> GetEmployeeSkills(
            [FromQuery] int? departmentId, CancellationToken ct)
        {
            var query = Db.Employees.AsNoTracking().Where(e => e.Status == "Active");
            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);

            var rows = await query
                .OrderBy(e => e.User!.FirstName)
                .ThenBy(e => e.User!.LastName)
                .Select(e => new
                {
                    e.EmployeeId,
                    FirstName = e.User!.FirstName,
                    LastName = e.User.LastName,
                    e.JobTitle,
                    e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : null,
                    Skills = e.EmployeeSkills
                        .Select(es => new { es.SkillId, es.ProficiencyLevel })
                        .ToList()
                })
                .ToListAsync(ct);

            var skills = await Db.Skills.AsNoTracking()
                .OrderBy(s => s.Name)
                .Select(s => new InsightSkillRef { SkillId = s.SkillId, Name = s.Name, Category = s.Category })
                .ToListAsync(ct);

            return Ok(new InsightEmployeeSkillsResponse
            {
                GeneratedAt = DateTime.UtcNow,
                DepartmentId = departmentId,
                EmployeeCount = rows.Count,
                Skills = skills,
                Employees = rows.Select(r => new InsightEmployeeRow
                {
                    EmployeeId = r.EmployeeId,
                    EmployeeName = r.FirstName + " " + r.LastName,
                    JobTitle = r.JobTitle,
                    DepartmentId = r.DepartmentId,
                    DepartmentName = r.DepartmentName,
                    Skills = r.Skills
                        .Select(s => new InsightEmployeeSkill { SkillId = s.SkillId, Level = s.ProficiencyLevel })
                        .ToList()
                }).ToList()
            });
        }

        // GET api/insights/skills/summary?departmentId=3
        [HttpGet("skills/summary")]
        public async Task<ActionResult<InsightSkillSummaryResponse>> GetSkillsSummary(
            [FromQuery] int? departmentId, CancellationToken ct)
        {
            var employees = Db.Employees.AsNoTracking().Where(e => e.Status == "Active");
            var held = Db.EmployeeSkills.AsNoTracking().Where(es => es.Employee!.Status == "Active");

            if (departmentId.HasValue)
            {
                employees = employees.Where(e => e.DepartmentId == departmentId.Value);
                held = held.Where(es => es.Employee!.DepartmentId == departmentId.Value);
            }

            var total = await employees.CountAsync(ct);

            // One row per skill and level: how many people
            var counts = await held
                .GroupBy(es => new { es.SkillId, es.ProficiencyLevel })
                .Select(g => new { g.Key.SkillId, g.Key.ProficiencyLevel, Count = g.Count() })
                .ToListAsync(ct);

            var countsBySkill = counts
                .GroupBy(c => c.SkillId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var programmeCounts = await Db.TrainingProgrammeSkills.AsNoTracking()
                .Where(ps => ps.Programme!.IsActive)
                .GroupBy(ps => ps.SkillId)
                .Select(g => new { SkillId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SkillId, x => x.Count, ct);

            var skills = await Db.Skills.AsNoTracking()
                .OrderBy(s => s.Name)
                .Select(s => new { s.SkillId, s.Name, s.Category })
                .ToListAsync(ct);

            var items = skills.Select(s =>
            {
                countsBySkill.TryGetValue(s.SkillId, out var levels);
                levels ??= new();

                int Of(ProficiencyLevel level) => levels.Where(l => l.ProficiencyLevel == level).Sum(l => l.Count);

                var beginner = Of(ProficiencyLevel.Beginner);
                var intermediate = Of(ProficiencyLevel.Intermediate);
                var expert = Of(ProficiencyLevel.Expert);
                var people = beginner + intermediate + expert;

                return new InsightSkillSummaryItem
                {
                    SkillId = s.SkillId,
                    SkillName = s.Name,
                    Category = s.Category,
                    EmployeeCount = people,
                    BeginnerCount = beginner,
                    IntermediateCount = intermediate,
                    ExpertCount = expert,
                    CoveragePercent = total == 0 ? 0 : Math.Round(100.0 * people / total, 1),
                    ActiveProgrammeCount = programmeCounts.GetValueOrDefault(s.SkillId)
                };
            }).ToList();

            return Ok(new InsightSkillSummaryResponse
            {
                GeneratedAt = DateTime.UtcNow,
                DepartmentId = departmentId,
                ActiveEmployeeCount = total,
                Skills = items
            });
        }

        // GET api/insights/career-interests?departmentId=3
        // Only goals the employee shares, that are Active, for active employees.
        [HttpGet("career-interests")]
        public async Task<ActionResult<InsightCareerInterestsResponse>> GetCareerInterests(
            [FromQuery] int? departmentId, CancellationToken ct)
        {
            var query = Db.CareerGoals.AsNoTracking()
                .Where(g => g.ShareWithHr
                         && g.Status == CareerGoalStatus.Active
                         && g.Employee!.Status == "Active");

            if (departmentId.HasValue)
                query = query.Where(g => g.Employee!.DepartmentId == departmentId.Value);

            var goals = await query
                .Select(g => new
                {
                    g.CareerGoalId,
                    g.EmployeeId,
                    g.TargetRole,
                    g.TargetDate,
                    FirstName = g.Employee!.User!.FirstName,
                    LastName = g.Employee.User.LastName,
                    g.Employee.JobTitle,
                    DepartmentName = g.Employee.Department != null ? g.Employee.Department.Name : null
                })
                .ToListAsync(ct);

            // "Tech Lead" and "tech  lead" are the same interest; "Team Lead" is not
            var interests = goals
                .GroupBy(g => GroupKey(g.TargetRole))
                .Select(group =>
                {
                    var employees = group
                        .GroupBy(g => g.EmployeeId)
                        .Select(e => e.First())
                        .OrderBy(g => g.FirstName).ThenBy(g => g.LastName)
                        .Select(g => new InsightCareerInterestEmployee
                        {
                            EmployeeId = g.EmployeeId,
                            EmployeeName = g.FirstName + " " + g.LastName,
                            JobTitle = g.JobTitle,
                            DepartmentName = g.DepartmentName,
                            CareerGoalId = g.CareerGoalId,
                            TargetDate = g.TargetDate
                        })
                        .ToList();

                    // Show the spelling used most often in the group
                    var display = group
                        .GroupBy(g => g.TargetRole.Trim())
                        .OrderByDescending(s => s.Count())
                        .ThenBy(s => s.Key, StringComparer.Ordinal)
                        .First().Key;

                    return new InsightCareerInterestItem
                    {
                        TargetRole = display,
                        EmployeeCount = employees.Count,
                        EarliestTargetDate = group.Where(g => g.TargetDate.HasValue).Min(g => g.TargetDate),
                        Employees = employees
                    };
                })
                .OrderByDescending(i => i.EmployeeCount)
                .ThenBy(i => i.TargetRole, StringComparer.OrdinalIgnoreCase)
                .ToList();

            return Ok(new InsightCareerInterestsResponse
            {
                GeneratedAt = DateTime.UtcNow,
                DepartmentId = departmentId,
                Interests = interests
            });
        }

        // GET api/insights/unknown-skills?top=50
        // Skills the AI recommended that aren't in the Skills table: candidates for Admin to add.
        [HttpGet("unknown-skills")]
        public async Task<ActionResult<InsightUnknownSkillsResponse>> GetUnknownSkills(
            [FromQuery] int top = 50, CancellationToken ct = default)
        {
            top = Math.Clamp(top, 1, 200);

            // Skills added since the advice was written still have SkillId = null on old steps,
            // so compare by normalised name and ignore anything that now exists
            var knownKeys = (await Db.Skills.AsNoTracking().Select(s => s.Name).ToListAsync(ct))
                .Select(n => SkillSuggestionRules.NameKey(n))
                .ToHashSet();

            // Project advice always counts. Career-goal advice counts only if the goal is shared
            // and not archived, so a private goal never shows up in a report.
            var steps = await Db.SkillAdviceItems.AsNoTracking()
                .Where(i => i.SkillId == null
                         && i.Advice!.Employee!.Status == "Active"
                         && (i.Advice.Source == SuggestionSource.Project
                             || (i.Advice.CareerGoal != null
                                 && i.Advice.CareerGoal.ShareWithHr
                                 && i.Advice.CareerGoal.Status != CareerGoalStatus.Archived)))
                .Select(i => new { i.SkillName, i.Advice!.EmployeeId, i.Advice.Source })
                .ToListAsync(ct);

            var skills = steps
                .Select(s => new { Key = SkillSuggestionRules.NameKey(s.SkillName), s.SkillName, s.EmployeeId, s.Source })
                .Where(s => s.Key.Length > 0 && !knownKeys.Contains(s.Key))
                .GroupBy(s => s.Key)
                .Select(g => new InsightUnknownSkillItem
                {
                    SkillName = g.GroupBy(x => x.SkillName.Trim())
                        .OrderByDescending(x => x.Count())
                        .ThenBy(x => x.Key, StringComparer.Ordinal)
                        .First().Key,
                    EmployeeCount = g.Select(x => x.EmployeeId).Distinct().Count(),
                    MentionCount = g.Count(),
                    FromCareerGoals = g.Count(x => x.Source == SuggestionSource.CareerGoal),
                    FromProjects = g.Count(x => x.Source == SuggestionSource.Project)
                })
                .OrderByDescending(s => s.EmployeeCount)
                .ThenByDescending(s => s.MentionCount)
                .ThenBy(s => s.SkillName, StringComparer.OrdinalIgnoreCase)
                .Take(top)
                .ToList();

            return Ok(new InsightUnknownSkillsResponse
            {
                GeneratedAt = DateTime.UtcNow,
                Skills = skills
            });
        }

        // Trim, collapse repeated spaces, ignore case
        private static string GroupKey(string role)
            => string.Join(' ', (role ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
                .ToLowerInvariant();
    }
}