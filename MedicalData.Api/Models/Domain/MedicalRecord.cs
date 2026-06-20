namespace MedicalData.Api.Models.Domain
{
    /// <summary>
    /// A medical record document, encrypted once with the patient's personal
    /// AES data key (AES-GCM). There is no per-document envelope here —
    /// the AES key itself is recovered via the envelope stored in
    /// AccessRequests.Api (one envelope per patient/authorized-user pair).
    /// </summary>
    public class MedicalRecord
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string RecordType { get; set; } // "Allergy" | "Condition" | "Immunization" | "Implant" | "Note"
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public Guid CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public User? Patient { get; set; }
        public User? CreatedByDoctor { get; set; }
    }
}