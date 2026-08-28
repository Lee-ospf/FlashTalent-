using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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

        // GET api/addressautocomplete?input=123+Main+Street
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
                // Use includedRegionCodes to restrict to SA instead of a radius bias
                // (radius max is 50km which is too small to cover all of SA)
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
    }
}
