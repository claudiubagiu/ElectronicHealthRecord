namespace Auth.Api.Models.Domain
{
    public class UserData
    {
        public required string IdentityId { get; set; }
        public required string Role { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public string? CNP { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public string? HospitalAffiliation { get; set; }
    }
}
