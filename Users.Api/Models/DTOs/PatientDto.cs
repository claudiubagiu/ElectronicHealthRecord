namespace Users.Api.Models.DTOs
{
    public class PatientDto
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Address { get; set; }
    }
}
