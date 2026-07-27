using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;
using TalentHub.DTOs;

namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Recruiter,Admin")]
    public class ClientController : TalentHubControllerBase
    {
        public ClientController(AppDbContext db) : base(db)
        {
        }

        // GET: api/Client
        // Recruiter/Admin - needed when creating a client-placement vacancy.
        [HttpGet]
        public async Task<ActionResult<List<ClientResponse>>> GetAllClients()
        {
            var clients = await Db.Clients.ToListAsync();
            var result = clients.Select(c => MapToResponse(c)).ToList();

            return Ok(result);
        }

        // GET: api/Client/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClientResponse>> GetClientById(int id)
        {
            var client = await Db.Clients.FindAsync(id);

            if (client is null)
                return NotFound($"Client with ID {id} not found.");

            return Ok(MapToResponse(client));
        }

        // POST: api/Client
        // Admin only - managing the client list.
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<ClientResponse>> CreateClient([FromBody] ClientDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var client = new Client
            {
                ClientName = dto.ClientName,
                ContactPerson = dto.ContactPerson,
                ContactEmail = dto.ContactEmail,
                ContactPhone = dto.ContactPhone
            };

            Db.Clients.Add(client);
            await Db.SaveChangesAsync();

            return Ok(MapToResponse(client));
        }

        private static ClientResponse MapToResponse(Client c)
        {
            return new ClientResponse
            {
                ClientId = c.ClientId,
                ClientName = c.ClientName,
                ContactPerson = c.ContactPerson,
                ContactEmail = c.ContactEmail,
                ContactPhone = c.ContactPhone
            };
        }
    }
}