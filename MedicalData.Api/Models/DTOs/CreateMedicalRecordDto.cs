namespace MedicalData.Api.Models.DTOs
{
    public class CreateMedicalRecordDto
    {
        public required Guid PatientId { get; set; }
        public required string RecordType { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public required string EncryptedDocumentKey { get; set; }
    }
}