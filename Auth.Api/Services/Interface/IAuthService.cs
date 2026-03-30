using Auth.Api.Domain.Models;
using Auth.Api.Models.DTOs;
using FluentResults;

namespace Auth.Api.Services.Interface
{
    /// <summary>
    /// Defines the contract for the authentication service, handling
    /// challenge generation, ECC signature verification, registration, and login.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Registers a new user with ECC-based authentication.
        /// Verifies the ECC signature against the provided public key,
        /// creates the identity, and returns a JWT token.
        /// </summary>
        Task<Result<LoginResponseDto>> Register(RegisterRequestDto registerRequestDto);

        /// <summary>
        /// Generates a cryptographically secure random challenge for the given wallet address.
        /// For existing users the challenge is persisted on the user record.
        /// For new users (pre-registration) it is stored in a short-lived memory cache.
        /// </summary>
        Task<string?> GenerateChallengeAsync(string walletAddress);

        /// <summary>
        /// Verifies the ECC signature of the challenge for an existing user.
        /// On success, rotates the challenge and returns a JWT token.
        /// </summary>
        Task<Result<LoginResponseDto>> VerifyEccSignatureAsync(string walletAddress, string eccSignature, string challenge);
    }
}