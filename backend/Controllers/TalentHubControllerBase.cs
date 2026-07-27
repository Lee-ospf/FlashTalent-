using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TalentHub.Data;

namespace TalentHub.Controllers
{
    public abstract class TalentHubControllerBase : ControllerBase
    {
        protected readonly AppDbContext Db;

        protected TalentHubControllerBase(AppDbContext db)
        {
            Db = db;
        }

        // Gets the logged-in user's ID from their token
        protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // True if this is the candidate's OWN record, or an Admin
        protected async Task<bool> IsOwnerOrAdmin(int candidateId)
        {
            if (User.IsInRole("Admin")) return true;
            return await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId && c.UserId == CurrentUserId);
        }

        // Same as above, but also allows any Recruiter to view
        protected async Task<bool> IsOwnerOrPrivileged(int candidateId)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Recruiter")) return true;
            return await Db.Candidates.AnyAsync(c => c.CandidateId == candidateId && c.UserId == CurrentUserId);
        }
    }
}