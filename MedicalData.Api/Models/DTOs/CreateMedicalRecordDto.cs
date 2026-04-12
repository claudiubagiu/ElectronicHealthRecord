namespace MedicalData.Api.Models.DTOs
{
    public class CreateMedicalRecordDto
    {
        public required Guid PatientId { get; set; }
        public required string RecordType { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public required List<EnvelopeDto> Envelopes { get; set; }
    }

    public class EnvelopeDto
    {
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}