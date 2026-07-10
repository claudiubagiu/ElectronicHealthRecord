using Auth.Api.Domain.Models;
using Auth.Api.Infrastructure.RabbitMQ.Interface;
using Auth.Api.Mappings;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;
using Auth.Api.Repositories.Interface;
using Auth.Api.Services.Interface;
using FluentResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Signer;
using System.Security.Cryptography;

namespace Auth.Api.Services.Implementation
{
    public class AuthService : IAuthService
    {
        private static readonly HashSet<string> RolesThatRequireApproval = new(StringComparer.OrdinalIgnoreCase)
        {
            "Doctor",
            "LaboratoryTechnician",
            "Pharmacist",
            "MedicalAssistant"
        };

        private readonly UserManager<ApplicationUser> userManager;
        private readonly ITokenRepository tokenRepository;
        private readonly IGenericRabbitMQService<UserData> genericRabbitMQService;
        private readonly IGenericRabbitMQService<AesKeyRotatedEvent> aesKeyRotatedRabbitMQService;
        private readonly IMemoryCache cache;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            ITokenRepository tokenRepository,
            IGenericRabbitMQService<UserData> genericRabbitMQService,
            IGenericRabbitMQService<AesKeyRotatedEvent> aesKeyRotatedRabbitMQService,
            IMemoryCache cache)
        {
            this.userManager = userManager;
            this.tokenRepository = tokenRepository;
            this.genericRabbitMQService = genericRabbitMQService;
            this.aesKeyRotatedRabbitMQService = aesKeyRotatedRabbitMQService;
            this.cache = cache;
        }
        public async Task<Result<LoginResponseDto>> Register(RegisterRequestDto registerRequestDto)
        {
            var walletAddress = registerRequestDto.WalletAddress.ToLower();

            var existingWalletUser = await userManager.Users
                .FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (existingWalletUser != null)
                return Result.Fail<LoginResponseDto>(
                    new Error("Wallet already registered").WithMetadata("StatusCode", 409));

            var existingEmailUser = await userManager.FindByEmailAsync(registerRequestDto.Email);

            if (existingEmailUser != null)
                return Result.Fail<LoginResponseDto>(
                    new Error("Email already registered").WithMetadata("StatusCode", 409));

            // Retrieve the cached challenge for this wallet (pre-registration)
            if (!cache.TryGetValue($"register_challenge_{walletAddress}", out string? cachedChallenge))
                return Result.Fail<LoginResponseDto>(
                    new Error("Challenge not found or expired").WithMetadata("StatusCode", 400));

            // Verify the ECC signature against the provided public key
            var signer = new EthereumMessageSigner();
            var recoveredAddress = signer.EncodeUTF8AndEcRecover(cachedChallenge!, registerRequestDto.EccSignature).ToLower();

            var expectedAddress = new EthECKey(registerRequestDto.EccPublicKey.HexToByteArray(), false).GetPublicAddress().ToLower();

            if (recoveredAddress != expectedAddress)
                return Result.Fail<LoginResponseDto>(
                    new Error("Invalid ECC signature").WithMetadata("StatusCode", 401));

            cache.Remove($"register_challenge_{walletAddress}");

            // Determine whether this user needs administrator approval.
            // A user is auto-approved only if ALL their requested roles are non-medical.
            var requiresApproval = registerRequestDto.Roles
                .Any(r => RolesThatRequireApproval.Contains(r));

            var user = Mapper.ToApplicationUser(registerRequestDto);
            user.Challenge = GenerateSecureChallenge();
            user.IsApproved = !requiresApproval;
            user.EncryptedAesKey = registerRequestDto.EncryptedAesKey;

            var result = await userManager.CreateAsync(user);

            if (result.Succeeded)
            {
                var roles = new List<string>(registerRequestDto.Roles);
                result = await userManager.AddToRolesAsync(user, roles);

                var userCreated = await userManager.FindByEmailAsync(registerRequestDto.Email);
                if (result.Succeeded && userCreated != null)
                {
                    var response = Mapper.ToLoginResponseDto(userCreated);
                    var jwtToken = tokenRepository.CreateToken(user, roles);
                    response.Token = jwtToken;

                    UserData userData = new UserData
                    {
                        IdentityId = userCreated.Id,
                        Role = roles.First(),
                        FirstName = registerRequestDto.FirstName,
                        LastName = registerRequestDto.LastName,
                        WalletAddress = registerRequestDto.WalletAddress,
                        PublicKey = registerRequestDto.EccPublicKey,
                        EncryptedAesKey = registerRequestDto.EncryptedAesKey,
                        CNP = registerRequestDto.CNP,
                        DateOfBirth = registerRequestDto.DateOfBirth,
                        Specialization = registerRequestDto.Specialization,
                        LicenseNumber = registerRequestDto.LicenseNumber,
                        EntityAffiliation = registerRequestDto.EntityAffiliation,
                    };

                    await genericRabbitMQService.PublishAsync(userData, "identity-created-queue");
                    return Result.Ok(response);
                }
            }

            return Result.Fail<LoginResponseDto>(
                new Error("User creation failed").WithMetadata("StatusCode", 500));
        }
        public async Task<string?> GenerateChallengeAsync(string walletAddress)
        {
            walletAddress = walletAddress.ToLower();
            var challenge = GenerateSecureChallenge();

            var user = await userManager.Users
                .FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (user != null)
            {
                user.Challenge = challenge;
                await userManager.UpdateAsync(user);
            }
            else
            {
                cache.Set(
                    $"register_challenge_{walletAddress}",
                    challenge,
                    TimeSpan.FromMinutes(5));
            }

            return challenge;
        }
        public async Task<Result<LoginResponseDto>> VerifyEccSignatureAsync(
            string walletAddress, string eccSignature, string challenge)
        {
            walletAddress = walletAddress.ToLower();

            var user = await userManager.Users
                .Include(u => u.User)
                .FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (user == null)
                return Result.Fail<LoginResponseDto>(
                    new Error("User not found. You need to register first.").WithMetadata("StatusCode", 404));

            if (user.Challenge != challenge)
                return Result.Fail<LoginResponseDto>(
                    new Error("Challenge mismatch").WithMetadata("StatusCode", 401));

            if (string.IsNullOrEmpty(user.EccPublicKey))
                return Result.Fail<LoginResponseDto>(
                    new Error("No ECC public key registered for this user").WithMetadata("StatusCode", 401));

            // Verify the ECC signature against the stored public key
            var signer = new EthereumMessageSigner();
            var recoveredAddress = signer.EncodeUTF8AndEcRecover(challenge, eccSignature).ToLower();

            var expectedAddress = new EthECKey(user.EccPublicKey.HexToByteArray(), false).GetPublicAddress().ToLower();

            if (recoveredAddress != expectedAddress)
                return Result.Fail<LoginResponseDto>(
                    new Error("Invalid ECC signature").WithMetadata("StatusCode", 401));

            // Block login for medical staff that have not been approved yet
            if (!user.IsApproved)
                return Result.Fail<LoginResponseDto>(
                    new Error("Your account is pending administrator approval. Please try again later.")
                        .WithMetadata("StatusCode", 403));

            // Rotate the challenge after successful verification
            user.Challenge = GenerateSecureChallenge();
            await userManager.UpdateAsync(user);

            var roles = await userManager.GetRolesAsync(user);
            var jwtToken = tokenRepository.CreateToken(user, roles.ToList());

            return Result.Ok(new LoginResponseDto { Token = jwtToken });
        }
        public async Task<Result> RotateAesKeyAsync(string identityId, string encryptedAesKey)
        {
            if (string.IsNullOrWhiteSpace(encryptedAesKey))
                return Result.Fail(
                    new Error("EncryptedAesKey is required.").WithMetadata("StatusCode", 400));

            var user = await userManager.Users
                .Include(u => u.User)
                .FirstOrDefaultAsync(u => u.Id == identityId);

            if (user == null)
                return Result.Fail(
                    new Error("User not found.").WithMetadata("StatusCode", 404));

            if (string.IsNullOrEmpty(user.EncryptedAesKey))
                return Result.Fail(
                    new Error("This account has no PatientMasterKey to rotate.")
                        .WithMetadata("StatusCode", 400));

            if (user.User == null)
                return Result.Fail(
                    new Error("This account is not fully linked yet. Please try again shortly.")
                        .WithMetadata("StatusCode", 409));

            if (!Guid.TryParse(user.User.Id, out var userId))
                return Result.Fail(
                    new Error("Failed to resolve the user id for this account.")
                        .WithMetadata("StatusCode", 500));

            user.EncryptedAesKey = encryptedAesKey;
            var updateResult = await userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
                return Result.Fail(
                    new Error("Failed to update the encryption key.").WithMetadata("StatusCode", 500));

            await aesKeyRotatedRabbitMQService.PublishAsync(
                new AesKeyRotatedEvent
                {
                    IdentityId = user.Id,
                    UserId = userId,
                    EncryptedAesKey = encryptedAesKey
                },
                "aes-key-rotated-queue");

            return Result.Ok();
        }
        private static string GenerateSecureChallenge()
        {
            var randomBytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToHexString(randomBytes);
        }
    }
}