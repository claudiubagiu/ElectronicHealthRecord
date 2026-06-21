namespace MedicalData.Api.Models.DTOs
{
    public class MedicalRecordDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string RecordType { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public required string EncryptedDocumentKey { get; set; }
        public Guid CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}