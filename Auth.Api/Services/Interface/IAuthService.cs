using Auth.Api.Domain.Models;
using Auth.Api.Models.DTOs;
using FluentResults;

namespace Auth.Api.Services.Interface
{
    public interface IAuthService
    {
        Task<Result<LoginResponseDto>> Register(RegisterRequestDto registerRequestDto);
        Task<string?> GenerateChallengeAsync(string walletAddress);
        Task<Result<LoginResponseDto>> VerifyEccSignatureAsync(string walletAddress, string eccSignature, string challenge);
        Task<Result> RotateAesKeyAsync(string identityId, string encryptedAesKey);
    }
}