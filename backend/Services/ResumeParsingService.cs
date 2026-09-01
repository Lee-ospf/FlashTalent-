using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TalentHub.DTOs;

namespace TalentHub.Services
{
    public interface IResumeParsingService
    {
        // Sends a CV file to Gemini and returns the extracted, structured (but
        // unsaved / unvalidated) data for the candidate to review before saving.
        // Nothing here touches the database - saving happens through the
        // existing Skills/Experience/Qualifications endpoints once the
        // candidate confirms the pre-filled data on the frontend.
        Task<ParsedResumeResponse> ParseAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default);
    }

    public class ResumeParsingService : IResumeParsingService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<ResumeParsingService> _logger;

        private static readonly JsonSerializerOptions JsonOpts =
            new(JsonSerializerDefaults.Web);

        // 500 RPD on the free tier, vs 20 RPD for the plain "Flash" models we
        // originally tested against - confirmed via the AI Studio rate-limit
        // dashboard. Same capability for structured extraction, much more
        // usable daily allowance.
        private const string ModelId = "gemini-3.5-flash-lite";

        public ResumeParsingService(
            HttpClient http,
            IConfiguration config,
            ILogger<ResumeParsingService> logger)
        {
            _http = http;
            _config = config;
            _logger = logger;
        }

        public async Task<ParsedResumeResponse> ParseAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default)
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Gemini:ApiKey is not configured in appsettings.json.");

            var base64 = Convert.ToBase64String(fileBytes);

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = BuildPrompt() },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = mimeType,
                                    data = base64
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    response_mime_type = "application/json",
                    temperature = 0 // deterministic extraction, not creative writing
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
                _logger.LogError(ex, "Network error calling Gemini for resume parsing.");
                throw new InvalidOperationException("Couldn't reach the AI service - please fill in your details manually.");
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Gemini rate limit hit (free tier: 500 requests/day for {Model}).", ModelId);
                throw new InvalidOperationException("AI assistance has hit today's usage limit - please fill in your details manually.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini resume parse failed: {Status} {Body}", response.StatusCode, errorBody);
                throw new InvalidOperationException("We couldn't read that CV automatically - please fill in your details manually.");
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            var geminiResponse = JsonSerializer.Deserialize<GeminiGenerateContentResponse>(raw, JsonOpts);

            var jsonText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(jsonText))
            {
                _logger.LogWarning("Gemini returned no extractable text. Raw response: {Raw}", raw);
                throw new InvalidOperationException("The AI couldn't extract anything from that file - please fill in your details manually.");
            }

            jsonText = StripMarkdownFences(jsonText);

            try
            {
                return JsonSerializer.Deserialize<ParsedResumeResponse>(jsonText, JsonOpts)
                       ?? new ParsedResumeResponse();
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Gemini returned malformed JSON: {JsonText}", jsonText);
                throw new InvalidOperationException("The AI's response couldn't be understood - please fill in your details manually.");
            }
        }

        // Guardrails below were added after testing against a real CV showed
        // Gemini would invent specific graduation dates that weren't actually
        // stated, and mark almost every skill "Expert" regardless of context.
        private static string BuildPrompt() => """
            You are extracting structured data from a candidate's CV/resume for a recruitment system.
            Read the attached document and return ONLY a JSON object (no markdown, no commentary, no
            explanation) with exactly this shape:

            {
              "phone": string or null,
              "skills": [ { "name": string, "category": "Technical" or "SoftSkill", "proficiencyLevel": "Beginner" or "Intermediate" or "Expert" } ],
              "qualifications": [ { "qualificationType": "Education" or "Certification", "name": string, "institution": string, "yearCompleted": "YYYY-MM-DD" or null } ],
              "experiences": [ { "company": string, "role": string, "startDate": "YYYY-MM-DD" or null, "endDate": "YYYY-MM-DD" or null, "projectsAndDuties": string or null } ]
            }

            Rules:
            - If a role is current/ongoing (e.g. "Present"), set endDate to null.
            - Only include skills genuinely evidenced in the document text - never invent skills that
              aren't mentioned or clearly implied by listed tools/technologies.
            - Category classification: "Technical" means programming languages, frameworks, libraries,
              databases, tools, platforms, IDEs, and technical practices/methodologies (examples:
              C#, Angular, SQL, Git, Agile/Scrum, System Design, Software Development, Web Development,
              Version Control). "SoftSkill" means interpersonal/behavioral traits only (examples:
              Communication, Teamwork, Leadership, Adaptability, Time Management, Problem-Solving).
              A methodology or engineering practice is Technical even if it's not a specific tool -
              do not classify it as SoftSkill just because it isn't a named product.
            - For yearCompleted: only fill this in if the CV states an explicit date or year for THAT
              SPECIFIC qualification. Do not infer, estimate, or guess a year from unrelated dates
              elsewhere on the CV (e.g. do not assume a graduation date based on when a job started).
              If genuinely unstated, return null - do not guess a specific date.
            - For proficiencyLevel: only use "Expert" when the CV shows clear evidence of extended,
              primary, hands-on use (e.g. it's part of the main tech stack in a real role, or years of
              experience are explicitly stated). A skill that is merely listed in a skills list without
              further context should default to "Intermediate", not "Expert".
            - Return valid JSON only. It will be parsed programmatically - no extra text before or after it.
            """;

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

        // ---- Minimal shape of Gemini's response - only what we actually read ----
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