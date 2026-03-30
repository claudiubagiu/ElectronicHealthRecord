using Auth.Api.Models.Domain;
using Microsoft.AspNetCore.Identity;

namespace Auth.Api.Domain.Models
{
    /// <summary>
    /// Extends the ASP.NET Identity user with blockchain wallet fields.
    /// The EccPublicKey is stored at registration time and used to verify
    /// ECC challenge-response signatures during login.
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        public required string WalletAddress { get; set; }

        /// <summary>
        /// The currently active challenge issued to this user during login.
        /// Rotated after every successful authentication attempt.
        /// </summary>
        public required string Challenge { get; set; }

        /// <summary>
        /// The user's secp256k1 uncompressed public key (hex, 0x04...).
        /// Set during registration and used to verify ECC signatures on login.
        /// </summary>
        public string? EccPublicKey { get; set; }

        public User? User { get; set; }
    }
}