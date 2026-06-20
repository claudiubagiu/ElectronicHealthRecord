namespace AccessRequests.Api.Models.DTOs
{
    public class EnvelopeDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public Guid UserId { get; set; }
        public string EncryptedAesKey { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}