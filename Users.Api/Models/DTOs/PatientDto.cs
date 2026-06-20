namespace Users.Api.Models.DTOs
{
    public class PatientDto
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string CNP { get; set; }
        public required DateTime DateOfBirth { get; set; }
        public required string PublicKey { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}