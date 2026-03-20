namespace Users.Api.Models.Messages
{
    public class IdentityCreatedEvent
    {
        public required string IdentityId { get; set; }
        public required string Role { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string PublicKey { get; set; }
        public required string EncryptedPrivateKey { get; set; }
        public string? CNP { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public string? HospitalAffiliation { get; set; }
        public string? Address { get; set; }
    }
}