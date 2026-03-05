using Auth.Api.Domain.Models;
using Auth.Api.Models.DTOs;
using FluentResults;

namespace Auth.Api.Services.Interface
{
    public interface IAuthService
    {
        Task<Result<LoginResponseDto>> Register(RegisterRequestDto registerRequestDto);
        Task<string?> GenerateNonceAsync(string walletAddress);
        Task<Result<LoginResponseDto>> VerifySignatureAsync(string walletAddress, string signature, string nonce);
    }
}
