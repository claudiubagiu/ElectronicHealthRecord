namespace Medications.Api.Models.DTOs
{
    public class BulkEnvelopeDto
    {
        public required List<CreateEnvelopeDto> Envelopes { get; set; }
    }

    public class CreateEnvelopeDto
    {
        public required Guid MedicationId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}