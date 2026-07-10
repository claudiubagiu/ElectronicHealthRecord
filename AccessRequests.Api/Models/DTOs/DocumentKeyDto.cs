namespace AccessRequests.Api.Models.DTOs
{
    public class DocumentKeyDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    public class CreateDocumentKeyDto
    {
        public required Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }
    public class RotateDocumentKeyEntryDto
    {
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }
    public class RotateDocumentKeysDto
    {
        public List<RotateDocumentKeyEntryDto> Entries { get; set; } = new();
    }
}