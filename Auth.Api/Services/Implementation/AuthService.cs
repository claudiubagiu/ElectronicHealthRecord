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
using Nethereum.Signer;
using System.Data;
using System.Security.Cryptography;

namespace Auth.Api.Services.Implementation
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> userManager;
        private readonly ITokenRepository tokenRepository;
        private readonly IMapper mapper;
        private readonly IGenericRabbitMQService<UserData> genericRabbitMQService;
        private readonly IMemoryCache cache;

        public AuthService(UserManager<ApplicationUser> userManager, 
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

        public async Task<Result<LoginResponseDto>> Register([FromBody] RegisterRequestDto registerRequestDto)
        {
            var walletAddress = registerRequestDto.WalletAddress.ToLower();
            var existingWalletUser = await userManager.Users.FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (existingWalletUser != null)
                return Result.Fail<LoginResponseDto>(
                    new Error("Wallet already registered").WithMetadata("StatusCode", 409));

            var existingEmailUser = await userManager.FindByEmailAsync(registerRequestDto.Email);

            if (existingEmailUser != null)
                return Result.Fail<LoginResponseDto>(
                    new Error("Email already registered").WithMetadata("StatusCode", 409));

            if (!cache.TryGetValue($"register_nonce_{walletAddress}", out string? cachedNonce))
                return Result.Fail<LoginResponseDto>(
                    new Error("Nonce not found").WithMetadata("StatusCode", 400));

            var signer = new EthereumMessageSigner();
            var recoveredAddress = signer.EncodeUTF8AndEcRecover(cachedNonce, registerRequestDto.Signature).ToLower();

            if (recoveredAddress != walletAddress)
                return Result.Fail<LoginResponseDto>(
                    new Error("Invalid signature").WithMetadata("StatusCode", 401));

            cache.Remove($"register_nonce_{walletAddress}");

            var user = mapper.Map<ApplicationUser>(registerRequestDto);
            user.Nonce = GenerateSecureNonce();
            var result = await userManager.CreateAsync(user);

            if (result.Succeeded)
            {
                List<string> roles = new List<string>();
                registerRequestDto.Roles.ForEach(role => { roles.Add(role); });
                result = await userManager.AddToRolesAsync(user, roles);

                var userCreated =  await userManager.FindByEmailAsync(registerRequestDto.Email);
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
                        PublicKey = registerRequestDto.PublicKey,
                        EncryptedPrivateKey = registerRequestDto.EncryptedPrivateKey,
                        CNP = registerRequestDto.CNP,
                        DateOfBirth = registerRequestDto.DateOfBirth,
                        Specialization = registerRequestDto.Specialization,
                        LicenseNumber = registerRequestDto.LicenseNumber,
                        HospitalAffiliation = registerRequestDto.HospitalAffiliation,
                    };
                    await genericRabbitMQService.PublishAsync(userData, "identity-created-queue");
                    return Result.Ok(response);
                }
            }
            return Result.Fail<LoginResponseDto>(
                new Error("User creation failed").WithMetadata("StatusCode", 500));
        }

        public async Task<string?> GenerateNonceAsync(string walletAddress)
        {
            walletAddress = walletAddress.ToLower();
            var nonce = GenerateSecureNonce();

            var user = await userManager.Users
                .FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (user != null)
            {
                user.Nonce = nonce;
                await userManager.UpdateAsync(user);
            }
            else
            {
                cache.Set(
                    $"register_nonce_{walletAddress}",
                    nonce,
                    TimeSpan.FromMinutes(5));
            }

            return nonce;
        }

        public async Task<Result<LoginResponseDto>> VerifySignatureAsync(string walletAddress, string signature, string nonce)
        {
            walletAddress = walletAddress.ToLower();

            var signer = new EthereumMessageSigner();

            var recoveredAddress = signer.EncodeUTF8AndEcRecover(nonce, signature).ToLower();

            if (recoveredAddress != walletAddress)
                return Result.Fail<LoginResponseDto>(
                    new Error("Invalid signature").WithMetadata("StatusCode", 401));

            var user = await userManager.Users.Include(u => u.User).FirstOrDefaultAsync(u => u.WalletAddress == walletAddress);

            if (user == null)
                return Result.Fail<LoginResponseDto>(
                    new Error("User not found. You need to register first.").WithMetadata("StatusCode", 404));

            if (user.Nonce != nonce)
                return Result.Fail<LoginResponseDto>(
                    new Error("Nonce mismatch").WithMetadata("StatusCode", 401));

            user.Nonce = GenerateSecureNonce();
            await userManager.UpdateAsync(user);

            var roles = await userManager.GetRolesAsync(user);

            var jwtToken = tokenRepository.CreateToken(user, roles.ToList());

            return Result.Ok(new LoginResponseDto { Token = jwtToken });
        }

        private string GenerateSecureNonce()
        {
            var randomBytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToHexString(randomBytes);
        }
    }
}
