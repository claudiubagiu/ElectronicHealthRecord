namespace Users.Api.Models.DTOs
{
    public class PharmacistDto
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string LicenseNumber { get; set; }
        public required string EntityAffiliation { get; set; }
        public required string PublicKey { get; set; }
    }
}