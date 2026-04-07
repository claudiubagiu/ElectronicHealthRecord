namespace Users.Api.Models.DTOs
{
    public class LaboratoryTechnicianDto
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string Specialization { get; set; }
        public required string HospitalAffiliation { get; set; }
        public required string PublicKey { get; set; }
    }
}