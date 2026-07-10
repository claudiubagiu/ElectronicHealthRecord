// Auth.Api.Tests/AuthServiceTests.cs
using Auth.Api.Domain.Models;
using Auth.Api.Infrastructure.RabbitMQ.Interface;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;
using Auth.Api.Repositories.Interface;
using Auth.Api.Services.Implementation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Xunit;

namespace Auth.Api.Tests
{
    public class AuthServiceTests
    {
        private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
        private readonly Mock<ITokenRepository> _tokenRepoMock;
        private readonly Mock<IGenericRabbitMQService<UserData>> _rabbitMqMock;
        private readonly Mock<IGenericRabbitMQService<AesKeyRotatedEvent>> _aesRabbitMqMock;
        private readonly IMemoryCache _cache;
        private readonly AuthService _service;

        public AuthServiceTests()
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            _userManagerMock = new Mock<UserManager<ApplicationUser>>(
                store.Object, null, null, null, null, null, null, null, null);

            _tokenRepoMock = new Mock<ITokenRepository>();
            _rabbitMqMock = new Mock<IGenericRabbitMQService<UserData>>();
            _aesRabbitMqMock = new Mock<IGenericRabbitMQService<AesKeyRotatedEvent>>();
            _cache = new MemoryCache(new MemoryCacheOptions());

            _service = new AuthService(
                _userManagerMock.Object,
                _tokenRepoMock.Object,
                _rabbitMqMock.Object,
                _aesRabbitMqMock.Object,
                _cache
            );
        }

        [Fact]
        public void Cache_ShouldStoreAndRetrieveChallenge()
        {
            _cache.Set("register_challenge_0xtest", "abc123", TimeSpan.FromMinutes(5));

            var found = _cache.TryGetValue("register_challenge_0xtest", out string? value);

            Assert.True(found);
            Assert.Equal("abc123", value);
        }

        [Fact]
        public void Cache_ShouldReturnFalse_WhenKeyDoesNotExist()
        {
            var found = _cache.TryGetValue("register_challenge_0xnonexistent", out string? value);

            Assert.False(found);
            Assert.Null(value);
        }

        [Fact]
        public void Cache_ShouldOverwriteExistingChallenge()
        {
            _cache.Set("register_challenge_0xwallet", "first", TimeSpan.FromMinutes(5));
            _cache.Set("register_challenge_0xwallet", "second", TimeSpan.FromMinutes(5));

            _cache.TryGetValue("register_challenge_0xwallet", out string? value);

            Assert.Equal("second", value);
        }

        [Fact]
        public void ApplicationUser_ShouldDefaultIsApprovedToFalse()
        {
            var user = new ApplicationUser
            {
                WalletAddress = "0xabc",
                Challenge = "challenge"
            };

            Assert.False(user.IsApproved);
        }

        [Fact]
        public void ApplicationUser_ShouldStoreWalletAddressCorrectly()
        {
            var user = new ApplicationUser
            {
                WalletAddress = "0xabc123",
                Challenge = "challenge"
            };

            Assert.Equal("0xabc123", user.WalletAddress);
        }

        [Fact]
        public void RegisterRequestDto_ShouldContainCorrectRoles()
        {
            var dto = new RegisterRequestDto
            {
                WalletAddress = "0xabc",
                Email = "test@test.com",
                UserName = "testuser",
                PhoneNumber = "0700000000",
                FirstName = "Test",
                LastName = "User",
                EccSignature = "sig",
                EccPublicKey = "pubkey",
                Roles = new List<string> { "Doctor" }
            };

            Assert.Contains("Doctor", dto.Roles);
            Assert.Single(dto.Roles);
        }

        [Fact]
        public void RegisterRequestDto_ShouldSupportMultipleRoles()
        {
            var dto = new RegisterRequestDto
            {
                WalletAddress = "0xabc",
                Email = "test@test.com",
                UserName = "testuser",
                PhoneNumber = "0700000000",
                FirstName = "Test",
                LastName = "User",
                EccSignature = "sig",
                EccPublicKey = "pubkey",
                Roles = new List<string> { "Doctor", "Administrator" }
            };

            Assert.Equal(2, dto.Roles.Count);
        }

        [Fact]
        public void TokenRepository_ShouldReturnMockedToken()
        {
            var user = new ApplicationUser
            {
                WalletAddress = "0xabc",
                Challenge = "challenge"
            };

            _tokenRepoMock
                .Setup(t => t.CreateToken(user, It.IsAny<List<string>>()))
                .Returns("mocked-jwt-token");

            var token = _tokenRepoMock.Object.CreateToken(user, new List<string> { "Patient" });

            Assert.Equal("mocked-jwt-token", token);
        }
    }
}