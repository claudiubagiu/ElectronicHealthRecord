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

        [HttpGet("search")]
        public async Task<IActionResult> SearchPatients([FromQuery] string search)
        {
            var patients = await usersService.GetPatiensByFullName(search);
            return Ok(patients);
        }

        /// <summary>
        /// Get the encrypted private key for the authenticated user (used at login to recover RSA private key).
        /// </summary>
        [HttpGet("keys/private")]
        [Authorize]
        public async Task<IActionResult> GetEncryptedPrivateKey()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == "role")?.Value
                         ?? User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            if (userIdClaim == null || roleClaim == null)
                return Unauthorized();

            var encryptedKey = await usersService.GetEncryptedPrivateKeyAsync(
                Guid.Parse(userIdClaim), roleClaim);

            if (encryptedKey == null)
                return NotFound("No encrypted private key found for this user.");

            return Ok(new EncryptedPrivateKeyDto { EncryptedPrivateKey = encryptedKey });
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