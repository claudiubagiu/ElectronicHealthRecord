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
        public required string EccSignature { get; set; }
        public required string EccPublicKey { get; set; }
        public string? EncryptedAesKey { get; set; }

        // Patient fields
        public string? CNP { get; set; }
        public DateTime? DateOfBirth { get; set; }

        // Doctor / LaboratoryTechnician fields
        public string? Specialization { get; set; }

        // Doctor / Pharmacist fields
        public string? LicenseNumber { get; set; }

        // Doctor / LaboratoryTechnician / Pharmacist fields
        // (Hospital for Doctor+LabTech, Pharmacy for Pharmacist)
        public string? EntityAffiliation { get; set; }
    }
}