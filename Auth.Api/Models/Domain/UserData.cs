namespace Auth.Api.Models.Domain
{
    public class UserData
    {
        public required string IdentityId { get; set; }
        public required string Role { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string PublicKey { get; set; }

        /// <summary>
        /// The user's encrypted AES data key (ECIES-wrapped with PublicKey).
        /// Propagated downstream so consuming services can store it locally.
        /// </summary>
        public required string EncryptedAesKey { get; set; }

        public string? CNP { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public string? EntityAffiliation { get; set; }
    }
}