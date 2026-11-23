using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using TalentHub.Models;

namespace TalentHub.Services
{
    // ================= Inputs and outputs =================

    // One run of a programme, as the shortlist sees it
    public record IntakeCandidate(
        int IntakeId, string Name, DateTime StartDate, DateTime EndDate, DateTime? ClosedAt,
        int? SpotsLeft);   // null = no maximum

    public record ProgrammeCandidate(
        int ProgrammeId, string Title, string? Provider, string? Category, decimal? DurationHours,
        bool IsActive, IReadOnlyCollection<int> SkillIds, IReadOnlyList<IntakeCandidate> Intakes);

    // A catalogue programme worth offering for the gaps, with when HR could place the employee
    public class ProgrammeShortlistItem
    {
        public int ProgrammeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public string? Category { get; set; }
        public decimal? DurationHours { get; set; }

        // Which of the employee's gap skills this programme covers
        public List<int> CoveredGapSkillIds { get; set; } = new();

        // The intake HR could assign them to today, or null: "ask HR to schedule one"
        public IntakeCandidate? NextOpenIntake { get; set; }
        public bool HasOpenIntake => NextOpenIntake != null;
    }

  
    // A skill step exactly as the AI returned it.
    public record AiSkillStep(string? Skill, string? Advice, string? TargetLevel);

    // A course step exactly as the AI returned it
    public record AiCourseStep(
        string? Title, string? Provider, string? Why, int? ProgrammeId, string? Description,
        IReadOnlyList<string>? Skills);

    // One step after checking, ready to save
    public class CleanedSuggestionItem
    {
        public AdviceItemKind Kind { get; set; }
        public int SortOrder { get; set; }            // numbered 1, 2, 3 within its kind
        public int? SkillId { get; set; }             // skill steps only; null = skill not in the Skills table
        public string SkillName { get; set; } = string.Empty;
        public ProficiencyLevel? TargetLevel { get; set; }
        public string Advice { get; set; } = string.Empty;   // skill step: how to build it. course step: why it helps
        public int? TrainingProgrammeId { get; set; }
        public string? ExternalIdea { get; set; }     // outside course: short description

        // Course steps only
        public string? CourseTitle { get; set; }
        public string? CourseProvider { get; set; }
        public List<string> SkillsGained { get; set; } = new();
    }

    public class CleanedSuggestionResult
    {
        public List<CleanedSuggestionItem> Items { get; set; } = new();

        // How many programme IDs the AI gave that don't exist, are retired, or weren't offered.
        // Worth logging: it shows how often the AI invents courses.
        public int DroppedProgrammeIds { get; set; }

        // Steps thrown away entirely (empty, duplicate, or beyond the maximum)
        public int DroppedItems { get; set; }
    }

    // ================= Skill name matching =================

    // Matches a skill name written by the AI to a row of the Skills table.
    // Ignores case, spaces and punctuation ("Node.js" = "NodeJS", "Power BI" = "PowerBI"),
    // but keeps # and + so "C#" never matches "C".
    // If two skills look the same once normalised (for example "Team work" and "Teamwork"),
    // the AI's text must equal one of them exactly (ignoring case) to pick it; otherwise it
    // matches neither, because guessing would attach advice to the wrong skill.
    public sealed class SkillNameMatcher
    {
        private readonly Dictionary<string, List<(int SkillId, string Name)>> _byKey = new();

        public SkillNameMatcher(IEnumerable<(int SkillId, string Name)> skills)
        {
            foreach (var skill in skills)
            {
                var key = SkillSuggestionRules.NameKey(skill.Name);
                if (key.Length == 0) continue;

                if (!_byKey.TryGetValue(key, out var list))
                    _byKey[key] = list = new List<(int, string)>();
                list.Add(skill);
            }
        }

        public (int SkillId, string Name)? Match(string? aiName)
        {
            var key = SkillSuggestionRules.NameKey(aiName);
            if (key.Length == 0 || !_byKey.TryGetValue(key, out var candidates))
                return null;

            if (candidates.Count == 1)
                return candidates[0];

            var wanted = aiName!.Trim();
            var exact = candidates
                .Where(c => string.Equals(c.Name.Trim(), wanted, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return exact.Count == 1 ? exact[0] : null;
        }
    }

    // ================= Rules =================

    // Pure logic: no database, no AI, no clock. The caller passes in everything,
    // so every case can be tried with data you choose.
    public static class SkillSuggestionRules
    {
        // Limits shared by the service and the controllers
        public const int DailyGenerationLimit = 5;   // per employee per day, from anyone
        public const int MaxActiveGoals = 3;
        public const int MaxGoalTextLength = 200;
        public const int MaxShortlist = 12;          // programmes offered to the AI
        public const int MaxSkillItems = 5;          // skills to build, kept from the AI
        public const int MaxCourseItems = 3;         

        private const int MaxSkillNameLength = 100;
        private const int MaxAdviceLength = 1000;
        private const int MaxExternalLength = 300;
        private const int MaxSummaryLength = 2000;

        private const int MaxTitleLength = 200;
        private const int MaxProviderLength = 200;

        // ---------- Skill name matching ----------

        public static string NameKey(string? name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;

            var sb = new StringBuilder();
            foreach (var ch in name.Trim().ToLowerInvariant())
                if (char.IsLetterOrDigit(ch) || ch == '#' || ch == '+')
                    sb.Append(ch);
            return sb.ToString();
        }

        // The intake HR could place someone in today: not ended, not closed early, not full.
        // Earliest start first, so a running intake (late joiners are allowed) comes before
        // a later upcoming one.
        public static IntakeCandidate? NextOpenIntake(IEnumerable<IntakeCandidate> intakes, DateTime today)
            => intakes
                .Where(i => TrainingIntakeRules.GetState(i.ClosedAt, i.StartDate, i.EndDate, today)
                                != TrainingIntakeState.Ended
                            && (i.SpotsLeft == null || i.SpotsLeft > 0))
                .OrderBy(i => i.StartDate).ThenBy(i => i.EndDate)
                .FirstOrDefault();

        // ---------- Catalogue shortlist ----------

        // Programmes worth offering for the gap skills. Order:
        //   1. programmes HR could assign today (an open intake with room) first
        //   2. then programmes covering more of the gaps
        //   3. then the one whose next intake starts soonest, then by title
        // Programmes that are retired, already in progress for this employee (excludeProgrammeIds),
        // or cover none of the gaps are left out.
        public static List<ProgrammeShortlistItem> BuildShortlist(
            IEnumerable<ProgrammeCandidate> programmes,
            IReadOnlyCollection<int> gapSkillIds,
            IReadOnlySet<int> excludeProgrammeIds,
            DateTime today,
            int max = MaxShortlist)
        {
            var gaps = gapSkillIds.ToHashSet();
            var items = new List<ProgrammeShortlistItem>();

            foreach (var p in programmes)
            {
                if (!p.IsActive || excludeProgrammeIds.Contains(p.ProgrammeId))
                    continue;

                var covered = p.SkillIds.Where(gaps.Contains).Distinct().OrderBy(x => x).ToList();
                if (covered.Count == 0)
                    continue;

                var next = NextOpenIntake(p.Intakes, today);

                items.Add(new ProgrammeShortlistItem
                {
                    ProgrammeId = p.ProgrammeId,
                    Title = p.Title,
                    Provider = p.Provider,
                    Category = p.Category,
                    DurationHours = p.DurationHours,
                    CoveredGapSkillIds = covered,
                    NextOpenIntake = next
                });
            }

            return items
                .OrderByDescending(i => i.HasOpenIntake)
                .ThenByDescending(i => i.CoveredGapSkillIds.Count)
                .ThenBy(i => i.NextOpenIntake?.StartDate ?? DateTime.MaxValue)
                .ThenBy(i => i.Title, StringComparer.OrdinalIgnoreCase)
                .Take(max)
                .ToList();
        }

        // ---------- Fingerprint (is a saved suggestion out of date?) ----------

        // What the suggestion is about, as a stable string. Case and extra spaces don't matter.
        public static string GoalSubject(string targetRole, DateTime? targetDate)
            => "goal|" + string.Join(' ', (targetRole ?? string.Empty)
                    .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
                .ToLowerInvariant()
               + "|" + (targetDate.HasValue ? targetDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : "");

        public static string ProjectSubject(
            int projectId, IEnumerable<(int SkillId, bool IsRequired, ProficiencyLevel MinimumLevel)> requirements)
            => "project|" + projectId + "|" + string.Join(",", requirements
                .OrderBy(r => r.SkillId)
                .Select(r => $"{r.SkillId}:{(r.IsRequired ? 1 : 0)}:{(int)r.MinimumLevel}"));

        // A 64-character hash of everything the AI is shown. If today's hash differs from the
        // saved one, the person's skills, the goal or project, or the available courses changed.
        public static string ComputeFingerprint(
            string subject,
            string? jobTitle,
            IEnumerable<(int SkillId, ProficiencyLevel Level)> employeeSkills,
            IEnumerable<int> shortlistedProgrammeIds)
        {
            var skills = string.Join(",", employeeSkills
                .OrderBy(s => s.SkillId)
                .Select(s => $"{s.SkillId}:{(int)s.Level}"));
            var programmes = string.Join(",", shortlistedProgrammeIds.Distinct().OrderBy(x => x));
            var title = string.Join(' ', (jobTitle ?? string.Empty)
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();

            var canonical = $"{subject}\n{title}\n{skills}\n{programmes}";
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
        }

        public static bool IsStale(string savedFingerprint, string currentFingerprint)
            => !string.Equals(savedFingerprint, currentFingerprint, StringComparison.Ordinal);

        // ---------- Checking what the AI returned ----------

        // The AI's answer is never trusted. This keeps only what is safe to save:
        //  - at most 5 skills and 5 courses, each numbered from 1
        //  - a programme ID is kept only if it was actually offered to the AI (validProgrammeIds)
        //  - a skill name is matched to the Skills table, or kept as plain text with no SkillId
        //  - a course is either a real catalogue programme or an outside course with its own title
        //  - a course title that is just a skill name is dropped (that is a skill, not a course)
        //  - a course must build at least one of the skills suggested above, and lists only those
        //  - text is trimmed and cut to the column sizes, and duplicates are removed
        public static CleanedSuggestionResult CleanAdvice(
            IEnumerable<AiSkillStep>? skills,
            IEnumerable<AiCourseStep>? courses,
            SkillNameMatcher matcher,
            IReadOnlySet<int> validProgrammeIds,
            IReadOnlyDictionary<int, IReadOnlyList<string>> programmeSkillNames,
            int maxSkills = MaxSkillItems,
            int maxCourses = MaxCourseItems)
        {
            var result = new CleanedSuggestionResult();
            var seen = new HashSet<string>();
            var suggested = new Dictionary<string, string>();   // NameKey -> the skill name as saved
            var skillCount = 0;
            var courseCount = 0;

            foreach (var step in skills ?? Enumerable.Empty<AiSkillStep>())
            {
                var skillText = Truncate(step.Skill, MaxSkillNameLength);
                var advice = Truncate(step.Advice, MaxAdviceLength);

                if (string.IsNullOrEmpty(skillText) || string.IsNullOrEmpty(advice))
                {
                    result.DroppedItems++;
                    continue;
                }

                var matched = matcher.Match(skillText);
                var name = matched?.Name ?? skillText;
                var key = ItemKey(AdviceItemKind.Skill, matched?.SkillId, name, null, null);

                if (skillCount >= maxSkills || !seen.Add(key))
                {
                    result.DroppedItems++;
                    continue;
                }

                skillCount++;
                suggested.TryAdd(NameKey(name), name);
                result.Items.Add(new CleanedSuggestionItem
                {
                    Kind = AdviceItemKind.Skill,
                    SortOrder = skillCount,
                    SkillId = matched?.SkillId,
                    SkillName = name,
                    TargetLevel = ParseLevel(step.TargetLevel),
                    Advice = advice
                });
            }

            foreach (var step in courses ?? Enumerable.Empty<AiCourseStep>())
            {
                var why = Truncate(step.Why, MaxAdviceLength);
                if (string.IsNullOrEmpty(why))
                {
                    result.DroppedItems++;
                    continue;
                }

                int? programmeId = null;
                if (step.ProgrammeId.HasValue)
                {
                    if (validProgrammeIds.Contains(step.ProgrammeId.Value))
                        programmeId = step.ProgrammeId.Value;
                    else
                        result.DroppedProgrammeIds++;
                }

                string? title = null, provider = null, description = null;
                if (programmeId == null)
                {
                    title = Truncate(step.Title, MaxTitleLength);
                    provider = Truncate(step.Provider, MaxProviderLength);
                    description = Truncate(step.Description, MaxExternalLength);

                    if (string.IsNullOrEmpty(title))
                    {
                        result.DroppedItems++;
                        continue;
                    }

                    // A course must be a course, not a skill name such as "API"
                    if (suggested.ContainsKey(NameKey(title)) || matcher.Match(title) != null)
                    {
                        result.DroppedItems++;
                        continue;
                    }
                }

                // Skills gained: only skills the AI itself suggested above
                var gained = new List<string>();
                foreach (var name in step.Skills ?? Array.Empty<string>())
                    if (suggested.TryGetValue(NameKey(name), out var canonical) && !gained.Contains(canonical))
                        gained.Add(canonical);

                // A catalogue course may not have been tagged by the AI: fall back to what the programme covers
                if (gained.Count == 0 && programmeId != null
                    && programmeSkillNames.TryGetValue(programmeId.Value, out var covered))
                {
                    foreach (var name in covered)
                        if (suggested.TryGetValue(NameKey(name), out var canonical) && !gained.Contains(canonical))
                            gained.Add(canonical);
                }

                // A course that builds none of the suggested skills isn't part of this plan
                if (gained.Count == 0)
                {
                    result.DroppedItems++;
                    continue;
                }

                var key = ItemKey(AdviceItemKind.Course, null, gained[0], programmeId, title);
                if (courseCount >= maxCourses || !seen.Add(key))
                {
                    result.DroppedItems++;
                    continue;
                }

                courseCount++;
                result.Items.Add(new CleanedSuggestionItem
                {
                    Kind = AdviceItemKind.Course,
                    SortOrder = courseCount,
                    SkillName = gained[0],
                    Advice = why,
                    TrainingProgrammeId = programmeId,
                    CourseTitle = string.IsNullOrEmpty(title) ? null : title,
                    CourseProvider = string.IsNullOrEmpty(provider) ? null : provider,
                    ExternalIdea = string.IsNullOrEmpty(description) ? null : description,
                    SkillsGained = gained
                });
            }

            return result;
        }

        // Identifies "the same step" across refreshes. A skill is identified by the skill, a course by
        // the programme (or by its title when it is an outside course). Used to remove duplicates, and
        // to keep an employee's Accepted or Dismissed choice when advice is regenerated.
        public static string ItemKey(AdviceItemKind kind, int? skillId, string skillName, int? programmeId, string? courseTitle)
        {
            if (kind == AdviceItemKind.Course)
                return "c|" + (programmeId?.ToString(CultureInfo.InvariantCulture) ?? "x:" + NameKey(courseTitle));

            return "s|" + (skillId?.ToString(CultureInfo.InvariantCulture) ?? "n:" + NameKey(skillName));
        }


        public static string? CleanSummary(string? summary)
        {
            var text = Truncate(summary, MaxSummaryLength);
            return string.IsNullOrEmpty(text) ? null : text;
        }

        // Names only. A number such as "2" is rejected, even though Enum.TryParse would accept it.
        public static ProficiencyLevel? ParseLevel(string? text)
        {
            if (string.IsNullOrWhiteSpace(text) || int.TryParse(text, out _))
                return null;

            return Enum.TryParse<ProficiencyLevel>(text.Trim(), ignoreCase: true, out var level)
                   && Enum.IsDefined(level)
                ? level
                : null;
        }

        private static string Truncate(string? text, int max)
        {
            var trimmed = (text ?? string.Empty).Trim();
            return trimmed.Length <= max ? trimmed : trimmed[..max].TrimEnd();
        }
    }
}