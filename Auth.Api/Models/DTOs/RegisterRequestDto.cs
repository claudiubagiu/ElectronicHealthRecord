using System.ComponentModel.DataAnnotations;

namespace Auth.Api.Models.DTOs
{
    public class RegisterRequestDto
    {
        [EmailAddress]
        public required string Email { get; set; }
        public required string UserName { get; set; }
        public required string PhoneNumber { get; set; }
        public required List<string> Roles { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string Signature { get; set; }
        public required string PublicKey { get; set; }
        public string? CNP { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public string? HospitalAffiliation { get; set; }
    }
}