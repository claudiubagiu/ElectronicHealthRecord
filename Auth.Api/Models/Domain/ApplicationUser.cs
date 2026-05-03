using Auth.Api.Models.Domain;
using Microsoft.AspNetCore.Identity;

namespace Auth.Api.Domain.Models
{
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

        /// <summary>
        /// Indicates whether this user is allowed to log in.
        /// Patients and Medical Assistants are approved automatically on registration.
        /// Doctors, Laboratory Technicians, and Pharmacists must be approved
        /// by an Administrator before they can authenticate.
        /// </summary>
        public bool IsApproved { get; set; } = false;

        public User? User { get; set; }
    }
}