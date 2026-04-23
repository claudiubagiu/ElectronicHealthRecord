namespace MedicalData.Api.Models.DTOs
{
    public class UpdateMedicalRecordDto
    {
        public required string RecordType { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public required List<EnvelopeDto> Envelopes { get; set; }
    }
}