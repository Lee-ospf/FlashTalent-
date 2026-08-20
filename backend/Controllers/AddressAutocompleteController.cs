using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace TalentHub.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AddressAutocompleteController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public AddressAutocompleteController(
            IHttpClientFactory httpClientFactory,
            IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        [HttpGet]
        public async Task<IActionResult> GetSuggestions([FromQuery] string input)
        {
            if (string.IsNullOrWhiteSpace(input) || input.Length < 3)
                return Ok(new { suggestions = new List<object>() });

            var apiKey = _config["GoogleMaps:ApiKey"];
            var client = _httpClientFactory.CreateClient();

            var requestBody = new
            {
                input = input,
                includedRegionCodes = new[] { "za" },
                languageCode = "en"
            };

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://places.googleapis.com/v1/places:autocomplete");

            request.Headers.Add("X-Goog-Api-Key", apiKey);
            request.Content = JsonContent.Create(requestBody);

            var response = await client.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new
                {
                    message = "Address lookup failed.",
                    googleError = json,
                    statusCode = (int)response.StatusCode
                });

            return Content(json, "application/json");
        }

        // GET api/addressautocomplete/details?placeId=ChIJ...
        [HttpGet("details")]
        public async Task<IActionResult> GetDetails([FromQuery] string placeId)
        {
            if (string.IsNullOrWhiteSpace(placeId))
                return BadRequest(new { message = "placeId is required." });

            var apiKey = _config["GoogleMaps:ApiKey"];
            var client = _httpClientFactory.CreateClient();

            var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://places.googleapis.com/v1/places/{placeId}?languageCode=en");

            request.Headers.Add("X-Goog-Api-Key", apiKey);
            request.Headers.Add("X-Goog-FieldMask", "addressComponents,formattedAddress");

            var response = await client.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new
                {
                    message = "Address details lookup failed.",
                    googleError = json,
                    statusCode = (int)response.StatusCode
                });

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            string? GetComponent(string type)
            {
                if (!root.TryGetProperty("addressComponents", out var components)) return null;
                foreach (var c in components.EnumerateArray())
                {
                    if (c.TryGetProperty("types", out var types) &&
                        types.EnumerateArray().Any(t => t.GetString() == type))
                    {
                        return c.TryGetProperty("longText", out var val) ? val.GetString() : null;
                    }
                }
                return null;
            }

            var streetNumber = GetComponent("street_number");
            var route = GetComponent("route");
            var line1 = string.Join(" ", new[] { streetNumber, route }.Where(s => !string.IsNullOrWhiteSpace(s)));

            var result = new
            {
                line1 = string.IsNullOrWhiteSpace(line1) ? null : line1,
                city = GetComponent("locality") ?? GetComponent("postal_town"),
                province = GetComponent("administrative_area_level_1"),
                postalCode = GetComponent("postal_code"), // often missing for SA – stays user-editable
                country = GetComponent("country")
            };

            return Ok(result);
        }
    }
}