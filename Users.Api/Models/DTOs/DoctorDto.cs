namespace Users.Api.Models.DTOs
{
    public class DoctorDto
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Specialization { get; set; }
        public required string LicenseNumber { get; set; }
        public required string HospitalAffiliation { get; set; }
    }
}
