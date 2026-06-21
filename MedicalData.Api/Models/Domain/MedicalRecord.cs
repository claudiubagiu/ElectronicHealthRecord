namespace MedicalData.Api.Models.Domain
{
    /// <summary>
    /// A medical record document, encrypted with a per-document AES key
    /// (DocumentKey, AES-GCM). The DocumentKey itself is encrypted with the
    /// patient's PatientMasterKey (also AES-GCM) and stored here as
    /// EncryptedDocumentKey. The PatientMasterKey is recovered via the
    /// envelope stored in AccessRequests.Api (one envelope per
    /// patient/authorized-user pair) — see Envelope.cs.
    ///
    /// Two-level key hierarchy:
    ///   PatientMasterKey (per patient, via envelope)
    ///     -> decrypts EncryptedDocumentKey -> DocumentKey (per document)
    ///       -> decrypts EncryptedData
    /// </summary>
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