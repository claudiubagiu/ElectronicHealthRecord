using Auth.Api.Models.DTOs;
using Auth.Api.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService authService;

        public AuthController(IAuthService authService)
        {
            this.authService = authService;
        }

        [HttpPost]
        [Route("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto loginRequestDto)
        {
            if (loginRequestDto == null ||
                string.IsNullOrWhiteSpace(loginRequestDto.WalletAddress) ||
                string.IsNullOrWhiteSpace(loginRequestDto.EccSignature) ||
                string.IsNullOrWhiteSpace(loginRequestDto.Challenge))
            {
                return BadRequest("Wallet address, ECC signature and challenge are required.");
            }

            var result = await authService.VerifyEccSignatureAsync(
                loginRequestDto.WalletAddress,
                loginRequestDto.EccSignature,
                loginRequestDto.Challenge);

            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? (int)error.Metadata["StatusCode"]
                : StatusCodes.Status400BadRequest;

            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Login failed",
                Detail = error.Message,
                Status = statusCode,
                Instance = HttpContext.Request.Path
            });
        }

        [HttpGet]
        [Route("challenge/{walletAddress}")]
        public async Task<IActionResult> GetChallenge(string walletAddress)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return BadRequest("Wallet address is required");

            var challenge = await authService.GenerateChallengeAsync(walletAddress);
            return Ok(new { challenge });
        }


        [HttpPost]
        [Route("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto registerRequestDto)
        {
            var result = await authService.Register(registerRequestDto);
            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? (int)error.Metadata["StatusCode"]
                : StatusCodes.Status400BadRequest;

            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Registration failed",
                Detail = error.Message,
                Status = statusCode,
                Instance = HttpContext.Request.Path
            });
        }

        [HttpPatch]
        [Route("me/aes-key")]
        [Authorize(Roles = "Patient")]
        public async Task<IActionResult> RotateAesKey([FromBody] RotateAesKeyRequestDto dto)
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var result = await authService.RotateAesKeyAsync(identityId, dto.EncryptedAesKey);
            if (result.IsSuccess)
                return NoContent();

            var error = result.Errors.First();

            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? (int)error.Metadata["StatusCode"]
                : StatusCodes.Status400BadRequest;

            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Key rotation failed",
                Detail = error.Message,
                Status = statusCode,
                Instance = HttpContext.Request.Path
            });
        }
    }
}