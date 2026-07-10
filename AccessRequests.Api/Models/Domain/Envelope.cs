namespace AccessRequests.Api.Models.Domain
{
    public class Envelope
    {
        public Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
        public DateTime CreatedAt { get; set; }

        public User? Patient { get; set; }
        public User? User { get; set; }
    }
}