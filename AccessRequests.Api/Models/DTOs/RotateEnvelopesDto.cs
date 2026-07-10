namespace AccessRequests.Api.Models.DTOs
{
    public class RotateEnvelopeEntryDto
    {
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
    public class RotateEnvelopesDto
    {
        public required List<RotateEnvelopeEntryDto> Entries { get; set; }
    }
}