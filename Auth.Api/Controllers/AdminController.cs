using Auth.Api.Domain.Models;
using Auth.Api.Mappings;
using Auth.Api.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class AdminController : ControllerBase
    {
        private static readonly HashSet<string> MedicalRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "Doctor", "LaboratoryTechnician", "Pharmacist", "MedicalAssistant"
        };

        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        [HttpGet("medics/pending")]
        public async Task<IActionResult> GetPendingMedics()
        {
            var allUsers = await _userManager.Users
                .Include(u => u.User)
                .ToListAsync();
            var result = new List<PendingMedicDto>();

            foreach (var user in allUsers.Where(u => !u.IsApproved))
            {
                var roles = await _userManager.GetRolesAsync(user);
                var isMedic = roles.Any(r => MedicalRoles.Contains(r));
                if (!isMedic) continue;

                result.Add(Mapper.ToPendingMedicDto(user, roles));
            }

            return Ok(result);
        }

        [HttpGet("medics/approved")]
        public async Task<IActionResult> GetApprovedMedics()
        {
            var allUsers = await _userManager.Users
                .Include(u => u.User)
                .ToListAsync();
            var result = new List<PendingMedicDto>();

            foreach (var user in allUsers.Where(u => u.IsApproved))
            {
                var roles = await _userManager.GetRolesAsync(user);
                var isMedic = roles.Any(r => MedicalRoles.Contains(r));
                if (!isMedic) continue;

                result.Add(Mapper.ToPendingMedicDto(user, roles));
            }

            return Ok(result);
        }

        [HttpPost("medics/{userId}/approve")]
        public async Task<IActionResult> ApproveMedic(string userId)
        {
            var user = await _userManager.Users
                .Include(u => u.User)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound(new ProblemDetails { Title = "User not found", Status = 404 });

            if (user.IsApproved)
                return Conflict(new ProblemDetails { Title = "User is already approved", Status = 409 });

            user.IsApproved = true;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
                return StatusCode(500, new ProblemDetails { Title = "Failed to approve user", Status = 500 });

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(Mapper.ToPendingMedicDto(user, roles));
        }

        [HttpPost("medics/{userId}/revoke")]
        public async Task<IActionResult> RevokeMedic(string userId)
        {
            var user = await _userManager.Users
                .Include(u => u.User)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound(new ProblemDetails { Title = "User not found", Status = 404 });

            if (!user.IsApproved)
                return Conflict(new ProblemDetails { Title = "User is not approved", Status = 409 });

            user.IsApproved = false;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
                return StatusCode(500, new ProblemDetails { Title = "Failed to revoke user", Status = 500 });

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(Mapper.ToPendingMedicDto(user, roles));
        }
    }
}