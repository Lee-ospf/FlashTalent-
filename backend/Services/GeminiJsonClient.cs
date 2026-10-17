using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TalentHub.Services
{
    public interface IGeminiJsonClient
    {
        string ModelId { get; }
        // Sends a prompt and returns the model's JSON text (markdown fences removed).
        Task<string> GenerateJsonAsync(string prompt, CancellationToken ct = default);

        Task<string> GenerateJsonFromFileAsync(string prompt, byte[] fileBytes, string mimeType, CancellationToken ct = default);

    }

    public class GeminiJsonClient : IGeminiJsonClient
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<GeminiJsonClient> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

        public string ModelId => "gemini-3.5-flash-lite";

        public GeminiJsonClient(HttpClient http, IConfiguration config, ILogger<GeminiJsonClient> logger)
        {
            _http = http;
            _config = config;
            _logger = logger;
        }

        public Task<string> GenerateJsonAsync(string prompt, CancellationToken ct = default)
         => SendAsync(new object[] { new { text = prompt } }, ct);

        public Task<string> GenerateJsonFromFileAsync(string prompt, byte[] fileBytes, string mimeType, CancellationToken ct = default)
            => SendAsync(new object[]
            {
        new { text = prompt },
        new { inline_data = new { mime_type = mimeType, data = Convert.ToBase64String(fileBytes) } }
            }, ct);

        private async Task<string> SendAsync(object[] parts, CancellationToken ct)
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new AiProviderException("Gemini:ApiKey is not configured in appsettings.json.");

            var body = new
            {
                contents = new[] { new { parts } },
                generationConfig = new { response_mime_type = "application/json", temperature = 0 }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelId}:generateContent?key={apiKey}";

            HttpResponseMessage response;
            try
            {
                response = await _http.PostAsJsonAsync(url, body, JsonOpts, ct);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Gemini.");
                throw new AiProviderException("Couldn't reach the AI service - please try again shortly.");
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Gemini rate limit hit for {Model}.", ModelId);
                throw new AiProviderException("AI matching has hit today's usage limit - please try again tomorrow.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini request failed: {Status} {Body}", response.StatusCode, error);
                throw new AiProviderException("The AI request failed - please try again shortly.");
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<GeminiResponse>(raw, JsonOpts);
            var text = parsed?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Gemini returned no text. Raw: {Raw}", raw);
                throw new AiProviderException("The AI didn't return a usable result - please try again shortly.");
            }

            return StripMarkdownFences(text);
        }

        
        private static string StripMarkdownFences(string text)
        {
            text = text.Trim();
            if (!text.StartsWith("```")) return text;

            var firstNewline = text.IndexOf('\n');
            var lastFence = text.LastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline)
                text = text[(firstNewline + 1)..lastFence].Trim();
            return text;
        }

        private class GeminiResponse
        {
            [JsonPropertyName("candidates")] public List<Candidate>? Candidates { get; set; }
        }
        private class Candidate
        {
            [JsonPropertyName("content")] public Content? Content { get; set; }
        }
        private class Content
        {
            [JsonPropertyName("parts")] public List<Part>? Parts { get; set; }
        }
        private class Part
        {
            [JsonPropertyName("text")] public string? Text { get; set; }
        }
    }
}