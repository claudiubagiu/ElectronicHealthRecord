namespace Diagnostics.Api.Models.DTOs
{
    public class RotateDocumentKeyEntryDto
    {
        public required Guid DraftId { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }

    public class RotateDocumentKeysDto
    {
        public required List<RotateDocumentKeyEntryDto> Entries { get; set; }
    }
}