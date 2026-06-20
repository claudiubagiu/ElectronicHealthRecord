namespace MedicalData.Api.Models.DTOs
{
    public class MedicalRecordDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public string RecordType { get; set; } = string.Empty;
        public string EncryptedData { get; set; } = string.Empty;
        public string Iv { get; set; } = string.Empty;
        public Guid CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}