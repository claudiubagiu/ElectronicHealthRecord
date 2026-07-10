using Auth.Api.Models.Domain;
using Microsoft.AspNetCore.Identity;

namespace Auth.Api.Domain.Models
{
    public class ApplicationUser : IdentityUser
    {
        public required string WalletAddress { get; set; }
        public required string Challenge { get; set; }
        public string? EccPublicKey { get; set; }
        public string? EncryptedAesKey { get; set; }
        public bool IsApproved { get; set; } = false;
        public User? User { get; set; }
    }
}