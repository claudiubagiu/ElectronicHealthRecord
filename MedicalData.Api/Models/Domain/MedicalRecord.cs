namespace MedicalData.Api.Models.Domain
{
    public class MedicalRecord
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string RecordType { get; set; } // "Allergy" | "Condition" | "Immunization" | "Implant" | "Note"
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public required string EncryptedDocumentKey { get; set; }
        public Guid CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public User? Patient { get; set; }
        public User? CreatedByDoctor { get; set; }
    }
}