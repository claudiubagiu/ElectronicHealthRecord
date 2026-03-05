using Auth.Api.Domain.Models;
using Auth.Api.Models.DTOs;
using Auth.Api.Services.Implementation;
using Auth.Api.Services.Interface;
using FluentResults;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
                string.IsNullOrWhiteSpace(loginRequestDto.Signature) ||
                string.IsNullOrWhiteSpace(loginRequestDto.Nonce))
            {
                return BadRequest("Wallet address, signature and nonce are required.");
            }

            var result = await authService.VerifySignatureAsync(loginRequestDto.WalletAddress, loginRequestDto.Signature, loginRequestDto.Nonce);
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
        [Route("nonce/{walletAddress}")]
        public async Task<IActionResult> GetNonce(string walletAddress)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return BadRequest("Wallet address is required");

            var nonce = await authService.GenerateNonceAsync(walletAddress);
            return Ok(new { nonce });
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
    }
}