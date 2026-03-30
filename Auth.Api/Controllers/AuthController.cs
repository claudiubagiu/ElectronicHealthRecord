using Auth.Api.Models.DTOs;
using Auth.Api.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers
{
    /// <summary>
    /// Handles all authentication endpoints: challenge generation,
    /// login via ECC signature verification, and user registration.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService authService;

        public AuthController(IAuthService authService)
        {
            this.authService = authService;
        }

        /// <summary>
        /// Authenticates an existing user by verifying the ECC signature
        /// of a previously issued challenge against the stored public key.
        /// Returns a JWT token on success.
        /// </summary>
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

        /// <summary>
        /// Generates a one-time cryptographic challenge for the given wallet address.
        /// The frontend must sign this challenge with the derived ECC key and send
        /// it back via the login or register endpoint.
        /// </summary>
        [HttpGet]
        [Route("challenge/{walletAddress}")]
        public async Task<IActionResult> GetChallenge(string walletAddress)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return BadRequest("Wallet address is required");

            var challenge = await authService.GenerateChallengeAsync(walletAddress);
            return Ok(new { challenge });
        }

        /// <summary>
        /// Registers a new user. Verifies the ECC signature of the challenge
        /// against the provided public key, creates the user identity, stores
        /// the ECC public key for future logins, and returns a JWT token.
        /// </summary>
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
    }
}