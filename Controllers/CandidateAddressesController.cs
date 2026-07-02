using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/candidates/{candidateId}/addresses")]
    public class CandidateAddressesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CandidateAddressesController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/candidates/{candidateId}/addresses
        [HttpGet]
        public async Task<ActionResult<List<AddressResponse>>> GetAll(int candidateId)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });

            var addresses = await _db.Addresses
                .Where(a => a.CandidateId == candidateId)
                .Select(a => MapToResponse(a))
                .ToListAsync();

            return Ok(addresses);
        }

        // GET api/candidates/{candidateId}/addresses/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<AddressResponse>> GetById(int candidateId, int id)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.CandidateId == candidateId);

            if (address == null)
                return NotFound(new { message = $"No address found with AddressId {id} for this candidate." });

            return Ok(MapToResponse(address));
        }

        // POST api/candidates/{candidateId}/addresses
        [HttpPost]
        public async Task<ActionResult<AddressResponse>> Create(int candidateId, CreateAddressRequest request)
        {
            var candidateExists = await _db.Candidates.AnyAsync(c => c.CandidateId == candidateId);
            if (!candidateExists)
                return NotFound(new { message = $"No candidate found with CandidateId {candidateId}." });

            if (!Enum.TryParse<AddressType>(request.AddressType, true, out var parsedType))
                return BadRequest(new { message = $"Invalid address type '{request.AddressType}'. Valid values: Residential, Postal." });

            // Enforce one address per type per candidate
            var typeAlreadyExists = await _db.Addresses
                .AnyAsync(a => a.CandidateId == candidateId && a.AddressType == parsedType);

            if (typeAlreadyExists)
                return Conflict(new { message = $"This candidate already has a {parsedType} address. Use PUT to update it instead." });

            var address = new Address
            {
                CandidateId = candidateId,
                AddressType = parsedType,
                Line1 = request.Line1,
                Line2 = request.Line2,
                City = request.City,
                Province = request.Province,
                PostalCode = request.PostalCode,
                Country = request.Country,
                CreatedAt = DateTime.UtcNow
            };

            _db.Addresses.Add(address);
            await _db.SaveChangesAsync();

            return Ok(MapToResponse(address));
        }

        // PUT api/candidates/{candidateId}/addresses/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<AddressResponse>> Update(int candidateId, int id, UpdateAddressRequest request)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.CandidateId == candidateId);

            if (address == null)
                return NotFound(new { message = $"No address found with AddressId {id} for this candidate." });

            address.Line1 = request.Line1;
            address.Line2 = request.Line2;
            address.City = request.City;
            address.Province = request.Province;
            address.PostalCode = request.PostalCode;
            address.Country = request.Country;
            address.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(MapToResponse(address));
        }

        // DELETE api/candidates/{candidateId}/addresses/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int candidateId, int id)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.CandidateId == candidateId);

            if (address == null)
                return NotFound(new { message = $"No address found with AddressId {id} for this candidate." });

            // Don't allow deleting the only Residential address - it's the primary/mandatory one
            if (address.AddressType == AddressType.Residential)
            {
                var totalAddresses = await _db.Addresses.CountAsync(a => a.CandidateId == candidateId);
                if (totalAddresses == 1)
                    return BadRequest(new { message = "Cannot delete the only address. A candidate must have at least one Residential address." });
            }

            _db.Addresses.Remove(address);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        private static AddressResponse MapToResponse(Address a) => new AddressResponse
        {
            AddressId = a.AddressId,
            CandidateId = a.CandidateId,
            AddressType = a.AddressType.ToString(),
            Line1 = a.Line1,
            Line2 = a.Line2,
            City = a.City,
            Province = a.Province,
            PostalCode = a.PostalCode,
            Country = a.Country,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };
    }
}