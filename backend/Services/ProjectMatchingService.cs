using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IProjectMatchingService
    {
        Task<ProjectMatchRunResponse> RunAsync(int projectId, CancellationToken ct = default);
        Task<ProjectMatchRunResponse?> GetAsync(int projectId, bool includeDismissed, CancellationToken ct = default);
    }

    public class ProjectMatchingService : IProjectMatchingService
    {
        private const int BatchSize = 25;

        private readonly AppDbContext _db;
        private readonly IGeminiJsonClient _gemini;
        private readonly ILogger<ProjectMatchingService> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
        {
            Converters = { new JsonStringEnumConverter() }
        };

        public ProjectMatchingService(AppDbContext db, IGeminiJsonClient gemini, ILogger<ProjectMatchingService> logger)
        {
            _db = db;
            _gemini = gemini;
            _logger = logger;
        }

       
        private static int CapByRequiredSkills(int score, GapAnalysisResult gaps)
        {
            if (gaps.RequiredTotal == 0 || gaps.MeetsAllRequiredSkills) return score;
            var cap = gaps.RequiredMet == 0 ? 39 : 60;
            return Math.Min(score, cap);
        }

        public async Task<ProjectMatchRunResponse> RunAsync(int projectId, CancellationToken ct = default)
        {
            var project = await _db.Projects
                .Include(p => p.ProjectSkills).ThenInclude(ps => ps.Skill)
                .FirstOrDefaultAsync(p => p.ProjectId == projectId, ct);

            if (project == null)
                throw new KeyNotFoundException($"No project found with ProjectId {projectId}.");
            if (project.Status == ProjectStatus.Closed)
                throw new InvalidOperationException("A closed project can't be matched.");
            if (!project.ProjectSkills.Any(ps => ps.IsRequired))
                throw new InvalidOperationException("Add at least one required skill before running a match.");

            // Deliberately no Include(User): names and personal details are never
            // loaded on the scoring path.
            var departmentId = project.DepartmentId;

            var employees = await _db.Employees
                .AsNoTracking()
                .AsSplitQuery()
                .Include(e => e.EmployeeSkills).ThenInclude(es => es.Skill)
                .Include(e => e.Qualifications)
                .Include(e => e.Experiences)
                .Where(e => e.Status == "Active"
                         && (departmentId == null || e.DepartmentId == departmentId))
                .ToListAsync(ct);

            var now = DateTime.UtcNow;

            if (employees.Count > 0)
            {
                // 1. Rule-based gaps
                var requirements = project.ProjectSkills
                    .Where(ps => ps.Skill != null)
                    .Select(ps => new GapSkillRequirement(ps.SkillId, ps.Skill!.Name, ps.IsRequired, ps.MinimumLevel))
                    .ToList();

                var gapsByEmployee = employees.ToDictionary(
                    e => e.EmployeeId,
                    e => GapAnalyzer.Analyze(
                        requirements,
                        e.EmployeeSkills
                            .Where(es => es.Skill != null)
                            .Select(es => new GapEmployeeSkill(es.SkillId, es.Skill!.Name, es.ProficiencyLevel))));

                // 2. AI scores, in batches
                var scores = await ScoreAllAsync(project, employees, gapsByEmployee, now, ct);

                // 3. Upsert, keeping HR's decisions
                var existing = await _db.ProjectMatches
                    .Where(m => m.ProjectId == projectId)
                    .ToDictionaryAsync(m => m.EmployeeId, ct);

                foreach (var e in employees)
                {
                    scores.TryGetValue(e.EmployeeId, out var ai);
                    var score = ai?.Score ?? 0;
                    var reasoning = ai?.Reasoning ?? "The AI did not score this employee. Use the skills gap list below.";
                    var capped = CapByRequiredSkills(score, gapsByEmployee[e.EmployeeId]);
                    if (capped < score)
                    {
                        reasoning += " (Score limited because not all required skills are met.)";
                        score = capped;
                    }
                    var gapJson = JsonSerializer.Serialize(gapsByEmployee[e.EmployeeId], JsonOpts);

                    if (existing.TryGetValue(e.EmployeeId, out var row))
                    {
                        row.Score = score;
                        row.Reasoning = reasoning;
                        row.GapDetailsJson = gapJson;
                        row.ComputedAt = now;
                        row.ModelVersion = _gemini.ModelId;
                    }
                    else
                    {
                        _db.ProjectMatches.Add(new ProjectMatch
                        {
                            ProjectId = projectId,
                            EmployeeId = e.EmployeeId,
                            Score = score,
                            Reasoning = reasoning,
                            GapDetailsJson = gapJson,
                            ComputedAt = now,
                            ModelVersion = _gemini.ModelId
                        });
                    }
                }
            }

            project.LastMatchedAt = now;
            await _db.SaveChangesAsync(ct);

            return (await GetAsync(projectId, includeDismissed: true, ct))!;
        }

        public async Task<ProjectMatchRunResponse?> GetAsync(int projectId, bool includeDismissed, CancellationToken ct = default)
        {
            var project = await _db.Projects.AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProjectId == projectId, ct);
            if (project == null) return null;

            var rows = await _db.ProjectMatches.AsNoTracking()
    .Include(m => m.Employee).ThenInclude(e => e!.User)
    .Include(m => m.Employee).ThenInclude(e => e!.Department)
    .Where(m => m.ProjectId == projectId
             && m.Employee!.Status == "Active"
             && (project.DepartmentId == null || m.Employee.DepartmentId == project.DepartmentId)
             && (includeDismissed || !m.IsDismissed))
    .ToListAsync(ct);

            var employeeIds = rows.Select(m => m.EmployeeId).ToList();

            var memberIds = (await _db.ProjectMembers.AsNoTracking()
                .Where(pm => pm.ProjectId == projectId)
                .Select(pm => pm.EmployeeId)
                .ToListAsync(ct)).ToHashSet();

            var activeCounts = await _db.ProjectMembers.AsNoTracking()
                .Where(pm => employeeIds.Contains(pm.EmployeeId) && pm.Project!.Status == ProjectStatus.Active)
                .GroupBy(pm => pm.EmployeeId)
                .Select(g => new { EmployeeId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EmployeeId, x => x.Count, ct);

            var matches = rows
                .Select(m => new ProjectMatchResponse
                {
                    ProjectMatchId = m.ProjectMatchId,
                    EmployeeId = m.EmployeeId,
                    FullName = m.Employee!.User != null
                        ? $"{m.Employee.User.FirstName} {m.Employee.User.LastName}" : "Unknown",
                    JobTitle = m.Employee.JobTitle,
                    DepartmentName = m.Employee.Department?.Name,
                    Score = m.Score,
                    Reasoning = m.Reasoning,
                    Gaps = DeserializeGaps(m.GapDetailsJson),
                    ActiveProjectCount = activeCounts.GetValueOrDefault(m.EmployeeId),
                    IsMember = memberIds.Contains(m.EmployeeId),
                    IsDismissed = m.IsDismissed,
                    ProfileUpdatedAt = m.Employee.ProfileUpdatedAt,
                    ComputedAt = m.ComputedAt
                })
                .OrderByDescending(m => m.Score)
                .ThenBy(m => m.FullName)
                .ToList();

            return new ProjectMatchRunResponse
            {
                ProjectId = projectId,
                LastMatchedAt = project.LastMatchedAt,
                Matches = matches
            };
        }

        // ---------- AI scoring ----------

        private async Task<Dictionary<int, AiScore>> ScoreAllAsync(
    Project project, List<Employee> employees,
    Dictionary<int, GapAnalysisResult> gaps, DateTime now, CancellationToken ct)
        {
            var projectProfile = new ProjectForPrompt
            {
                Name = project.Name,
                Description = project.Description,
                RequiredQualifications = project.RequiredQualifications,
                Skills = project.ProjectSkills
                    .Where(ps => ps.Skill != null)
                    .Select(ps => new SkillForPrompt
                    {
                        Name = ps.Skill!.Name,
                        Category = ps.Skill.Category.ToString(),
                        Level = ps.MinimumLevel.ToString(),
                        IsRequired = ps.IsRequired
                    }).ToList()
            };

            var results = new Dictionary<int, AiScore>();

            foreach (var batch in employees.Chunk(BatchSize))
            {
                var profiles = batch.Select(e => BuildEmployeeProfile(e, gaps[e.EmployeeId], now)).ToList();
                var json = await _gemini.GenerateJsonAsync(BuildPrompt(projectProfile, profiles), ct);

                List<AiScore> scored;
                try
                {
                    scored = JsonSerializer.Deserialize<List<AiScore>>(json, JsonOpts) ?? new();
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Gemini returned malformed JSON for project matching: {Json}", json);
                    throw new AiProviderException("The AI's response couldn't be understood - please try again shortly.");
                }

                var sentIds = batch.Select(e => e.EmployeeId).ToHashSet();
                foreach (var s in scored.Where(s => sentIds.Contains(s.EmployeeId)))
                {
                    s.Score = Math.Clamp(s.Score, 0, 100);
                    results[s.EmployeeId] = s;
                }

                var missing = sentIds.Except(scored.Select(s => s.EmployeeId)).ToList();
                if (missing.Count > 0)
                    _logger.LogWarning("Gemini omitted {Count} employee(s) for project {ProjectId}: {Ids}",
                        missing.Count, project.ProjectId, string.Join(",", missing));
            }

            return results;
        }

        // Only skills, qualifications and work history. No name, no personal details.
        private static EmployeeForPrompt BuildEmployeeProfile(Employee e, GapAnalysisResult gaps, DateTime now) => new()
        {
            EmployeeId = e.EmployeeId,
            RequiredSkillsMet = gaps.RequiredMet,
            RequiredSkillsTotal = gaps.RequiredTotal,
            SkillStatus = gaps.Skills.Select(s => new SkillStatusForPrompt
            {
                Skill = s.SkillName,
                IsRequired = s.IsRequired,
                RequiredLevel = s.RequiredLevel.ToString(),
                EmployeeLevel = s.EmployeeLevel?.ToString(),
                Status = s.Status.ToString()
            }).ToList(),
            Skills = e.EmployeeSkills
         .Where(es => es.Skill != null)
         .Select(es => new SkillForPrompt
         {
             Name = es.Skill!.Name,
             Category = es.Skill.Category.ToString(),
             Level = es.ProficiencyLevel.ToString()
         }).ToList(),
            Qualifications = e.Qualifications
         .Select(q => new QualificationForPrompt
         {
             Type = q.QualificationType.ToString(),
             Name = q.Name,
             Institution = q.Institution
         }).ToList(),
            WorkHistory = e.Experiences
         .OrderByDescending(x => x.StartDate)
         .Take(10)
         .Select(x => new WorkHistoryForPrompt
         {
             Role = x.Role,
             Years = Math.Round(Math.Max(0, ((x.EndDate ?? now) - x.StartDate).TotalDays) / 365.25, 1),
             Duties = Truncate(x.ProjectsAndDuties, 300)
         }).ToList()
        };

        private static string? Truncate(string? s, int max) =>
            string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);

        private static GapAnalysisResult DeserializeGaps(string json)
        {
            try { return JsonSerializer.Deserialize<GapAnalysisResult>(json, JsonOpts) ?? new(); }
            catch (JsonException) { return new(); }
        }

        private static string BuildPrompt(ProjectForPrompt project, List<EmployeeForPrompt> employees)
        {
            var projectJson = JsonSerializer.Serialize(project, JsonOpts);
            var employeesJson = JsonSerializer.Serialize(employees, JsonOpts);

            return $$"""
            You are scoring how well internal employees fit a project, for an HR system.
            Compare each employee against the project and return ONLY a JSON array (no markdown,
            no commentary) with exactly this shape, one entry per employee:

            [
              { "employeeId": number, "score": number (0-100), "reasoning": string }
            ]

            Rules:
            - Score every employee provided - do not omit any, and do not invent an employeeId.
            - Each employee has a "skillStatus" list. It was calculated by fixed rules and is
              authoritative. "Met" means the employee holds the skill at or above the requested level,
              "BelowLevel" means they hold it at a lower level, "Missing" means they do not hold it.
              Never say an employee has a skill that is Missing, and never say they lack a skill that
              is Met.
            - Work history can only help you judge how relevant their past roles are. It can never
              turn a Missing skill into a Met one.
            - Required skills (isRequired: true) matter most. An employee with any required skill
              Missing or BelowLevel must score clearly lower than an employee with all required skills Met.
            - Nice-to-have skills (isRequired: false) raise the score when present but must never
              count against an employee when absent.
            - Years in unrelated work (for example retail) do not count as relevant experience for a
              technical project.
            - Use the project's description as context for the real day-to-day work.
            - Base your judgement only on the data given. Do not guess anything about the person.
            - "reasoning" must be ONE short sentence (under 30 words), consistent with skillStatus.
            - Return valid JSON only.

            PROJECT:
            {{projectJson}}

            EMPLOYEES:
            {{employeesJson}}
            """;
        }

        private class ProjectForPrompt
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string RequiredQualifications { get; set; } = string.Empty;
            public List<SkillForPrompt> Skills { get; set; } = new();
        }

        private class EmployeeForPrompt
        {
            public int EmployeeId { get; set; }
            public List<SkillForPrompt> Skills { get; set; } = new();
            public List<QualificationForPrompt> Qualifications { get; set; } = new();
            public List<WorkHistoryForPrompt> WorkHistory { get; set; } = new();
            public int RequiredSkillsMet { get; set; }
            public int RequiredSkillsTotal { get; set; }
            public List<SkillStatusForPrompt> SkillStatus { get; set; } = new();
        }

        private class SkillForPrompt
        {
            public string Name { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string Level { get; set; } = string.Empty;
            public bool IsRequired { get; set; }
        }

        private class QualificationForPrompt
        {
            public string Type { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string Institution { get; set; } = string.Empty;
        }

        private class SkillStatusForPrompt
        {
            public string Skill { get; set; } = string.Empty;
            public bool IsRequired { get; set; }
            public string RequiredLevel { get; set; } = string.Empty;
            public string? EmployeeLevel { get; set; }
            public string Status { get; set; } = string.Empty;   // Met, BelowLevel or Missing
        }

        private class WorkHistoryForPrompt
        {
            public string Role { get; set; } = string.Empty;
            public double Years { get; set; }
            public string? Duties { get; set; }
        }

        private class AiScore
        {
            public int EmployeeId { get; set; }
            public int Score { get; set; }
            public string Reasoning { get; set; } = string.Empty;
        }
    }
}