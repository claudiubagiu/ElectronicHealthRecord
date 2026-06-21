namespace MedicalData.Api.Models.DTOs
{
    /// <summary>
    /// One entry in a batch key-rotation request: re-wraps a single
    /// document's DocumentKey under a new PatientMasterKey. EncryptedData
    /// and Iv are untouched — only EncryptedDocumentKey changes.
    /// </summary>
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