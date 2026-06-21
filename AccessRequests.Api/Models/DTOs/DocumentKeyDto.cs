namespace AccessRequests.Api.Models.DTOs
{
    /// <summary>
    /// Read DTO returned to the frontend after creating or fetching a DocumentKey.
    /// </summary>
    public class DocumentKeyDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Request body to register a new DocumentKey, sent right after a file
    /// has been encrypted client-side and uploaded to IPFS.
    /// </summary>
    public class CreateDocumentKeyDto
    {
        public required Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }

    /// <summary>
    /// One entry in a batch DocumentKey rotation request — the DocumentKey
    /// for a single IpfsCid, re-wrapped under the patient's new PatientMasterKey.
    /// </summary>
    public class RotateDocumentKeyEntryDto
    {
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }

    /// <summary>
    /// Batch request to re-wrap every DocumentKey under a new PatientMasterKey.
    /// Sent by the patient as part of a full PatientMasterKey rotation.
    /// </summary>
    public class RotateDocumentKeysDto
    {
        public List<RotateDocumentKeyEntryDto> Entries { get; set; } = new();
    }
}