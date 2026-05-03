using Auth.Api.Domain.Models;
using Auth.Api.Infrastructure.RabbitMQ.Interface;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Repositories.Interface;
using Auth.Api.Services.Interface;
using AutoMapper;
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
    /// <summary>
    /// Implements ECC challenge-response authentication.
    /// The user signs a server-issued challenge with a secp256k1 private key
    /// derived from their MetaMask wallet, and the backend verifies the
    /// signature using the stored ECC public key and Nethereum's EthECKey.
    ///
    /// Medical staff roles (Doctor, LaboratoryTechnician, Pharmacist) are created
    /// with IsApproved = false and cannot log in until an Administrator approves them.
    /// Patients and Medical Assistants are approved automatically on registration.
    /// </summary>
    public class AuthService : IAuthService
    {
        /// <summary>
        /// Roles that require explicit administrator approval before the user
        /// is permitted to log in. All other roles are auto-approved.
        /// </summary>
        private static readonly HashSet<string> RolesThatRequireApproval = new(StringComparer.OrdinalIgnoreCase)
        {
            "Doctor",
            "LaboratoryTechnician",
            "Pharmacist",
            "MedicalAssistant"
        };

        private readonly UserManager<ApplicationUser> userManager;
        private readonly ITokenRepository tokenRepository;
        private readonly IMapper mapper;
        private readonly IGenericRabbitMQService<UserData> genericRabbitMQService;
        private readonly IMemoryCache cache;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            ITokenRepository tokenRepository,
            IMapper mapper,
            IGenericRabbitMQService<UserData> genericRabbitMQService,
            IMemoryCache cache)
        {
            this.userManager = userManager;
            this.tokenRepository = tokenRepository;
            this.mapper = mapper;
            this.genericRabbitMQService = genericRabbitMQService;
            this.cache = cache;
        }

        /// <summary>
        /// Registers a new user by verifying the ECC signature of the challenge,
        /// storing the ECC public key, creating the identity record, publishing
        /// a domain event via RabbitMQ, and returning a JWT token.
        ///
        /// Medical staff roles are created with IsApproved = false.
        /// Patients and Medical Assistants are created with IsApproved = true.
        /// </summary>
        public async Task<Result<LoginResponseDto>> Register([FromBody] RegisterRequestDto registerRequestDto)
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

            var user = mapper.Map<ApplicationUser>(registerRequestDto);
            user.Challenge = GenerateSecureChallenge();
            user.IsApproved = !requiresApproval;

            var result = await userManager.CreateAsync(user);

            if (result.Succeeded)
            {
                var roles = new List<string>(registerRequestDto.Roles);
                result = await userManager.AddToRolesAsync(user, roles);

                var userCreated = await userManager.FindByEmailAsync(registerRequestDto.Email);
                if (result.Succeeded && userCreated != null)
                {
                    var response = mapper.Map<LoginResponseDto>(userCreated);
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

        /// <summary>
        /// Generates a cryptographically secure challenge for the specified wallet.
        /// If the wallet belongs to an existing user, the challenge is stored on the
        /// user record. Otherwise it is placed in a 5-minute memory cache entry for
        /// pre-registration verification.
        /// </summary>
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

        /// <summary>
        /// Verifies the ECC signature of the given challenge for an existing user.
        /// Uses the stored ECC public key to recover the signer address from the
        /// secp256k1 signature and compares it with the claimed wallet address.
        /// On success, rotates the challenge and issues a JWT token.
        ///
        /// Returns 403 Forbidden if the user has not yet been approved by an Administrator.
        /// </summary>
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

        /// <summary>
        /// Generates a 32-byte cryptographically secure random hex string
        /// used as a one-time challenge for authentication.
        /// </summary>
        private static string GenerateSecureChallenge()
        {
            var randomBytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToHexString(randomBytes);
        }
    }
}