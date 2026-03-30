using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Users.Api.Models.DTOs;
using Users.Api.Services.Interface;

namespace Users.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService usersService;

        public UsersController(IUsersService usersService)
        {
            this.usersService = usersService;
        }

        /// <summary>
        /// Returns the full patient profile for the currently authenticated user.
        /// Reads the "identityId" claim from the JWT to look up the patient record.
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var patient = await usersService.GetPatientByIdentityIdAsync(identityId);
            if (patient == null) return NotFound("Patient profile not found.");

            return Ok(patient);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchPatients([FromQuery] string search)
        {
            var patients = await usersService.GetPatiensByFullName(search);
            return Ok(patients);
        }

        /// <summary>
        /// Get the public key for a specific user (used when encrypting medication envelopes).
        /// </summary>
        [HttpGet("keys/public/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetPublicKey(Guid userId)
        {
            var publicKey = await usersService.GetPublicKeyAsync(userId);

            if (publicKey == null)
                return NotFound("No public key found for this user.");

            return Ok(publicKey);
        }

        /// <summary>
        /// Get public keys for multiple users at once (used when creating medication envelopes).
        /// </summary>
        [HttpPost("keys/public/bulk")]
        [Authorize]
        public async Task<IActionResult> GetPublicKeysBulk([FromBody] List<Guid> userIds)
        {
            var keys = await usersService.GetPublicKeysByUserIdsAsync(userIds);
            return Ok(keys);
        }
    }
}