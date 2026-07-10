namespace MedicalData.Api.Models.DTOs
{
    public class RotateDocumentKeyEntryDto
    {
        public required Guid RecordId { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }

    public class RotateDocumentKeysDto
    {
        public required List<RotateDocumentKeyEntryDto> Entries { get; set; }
    }
}