using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;
using TalentHub.DTOs;
namespace TalentHub.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClientController : Controller
    {
        private readonly AppDbContext _context;

        public ClientController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Client
        [HttpGet]
        public async Task<ActionResult<List<ClientResponse>>> GetAllClients()
        {
            var clients = await _context.Clients.ToListAsync();
            var result = clients.Select(c => MapToResponse(c)).ToList();

            return Ok(clients);
        }

        // GET: api/Client/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClientResponse>> GetClientById(int id)
        {
            var client = await _context.Clients.FindAsync(id);

            if (client is null)
                return NotFound($"Client with ID {id} not found.");

            return Ok(MapToResponse(client));
        }

        // POST: api/Client
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

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

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

