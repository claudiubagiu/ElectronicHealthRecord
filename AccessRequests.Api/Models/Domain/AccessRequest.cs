namespace AccessRequests.Api.Models.Domain
{
    public class AccessRequest
    {
        public Guid Id { get; set; }
        public required Guid DoctorId { get; set; }
        public required Guid PatientId { get; set; }
        public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        public User? Doctor { get; set; }
        public User? Patient { get; set; }
    }
}
