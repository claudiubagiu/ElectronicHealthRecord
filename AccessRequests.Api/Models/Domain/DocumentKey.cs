namespace AccessRequests.Api.Models.Domain
{
    public class DocumentKey
    {
        public Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public User? Patient { get; set; }
    }
}