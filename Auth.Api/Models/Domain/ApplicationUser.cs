using Auth.Api.Models.Domain;
using Microsoft.AspNetCore.Identity;

namespace Auth.Api.Domain.Models
{
    public class ApplicationUser : IdentityUser
    {
        public required string WalletAddress { get; set; }
        public required string Nonce { get; set; }

        public User? User { get; set; }
    }
}
