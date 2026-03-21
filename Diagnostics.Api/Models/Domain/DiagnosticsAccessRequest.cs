namespace Diagnostics.Api.Models.Domain
{
    public enum AccessRequestStatus { Pending, Approved, Rejected, Revoked }

    public class DiagnosticsAccessRequest
    {
        public Guid Id { get; set; }
        public required Guid DoctorId { get; set; }
        public required Guid PatientId { get; set; }
        public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
        public DateTime CreatedAt { get; set; }

        public User? Doctor { get; set; }
        public User? Patient { get; set; }
    }
}