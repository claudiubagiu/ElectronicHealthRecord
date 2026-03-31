namespace Diagnostics.Api.Models.DTOs
{
    public class AccessRequestDto
    {
        public Guid Id { get; set; }
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string DoctorWalletAddress { get; set; } = string.Empty;
        public Guid PatientId { get; set; }
        public string PatientWalletAddress { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}