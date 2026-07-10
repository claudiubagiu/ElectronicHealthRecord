namespace AccessRequests.Api.Models.Domain
{
    /// <summary>
    /// Holds the patient's personal AES data key, ECIES-encrypted with a
    /// specific authorized user's public key. Created when a patient approves
    /// an access request and removed when access is revoked or expires.
    ///
    /// The authorized user is not necessarily a Doctor — it can be any role
    /// with an approved AccessRequest (Doctor, LaboratoryTechnician,
    /// Pharmacist, MedicalAssistant, etc.), hence UserId rather than DoctorId.
    ///
    /// There is exactly one Envelope per (PatientId, UserId) pair —
    /// not one per document. Documents in MedicalData.Api and
    /// Diagnostics.Api are encrypted once with the patient's AES key;
    /// this envelope is what lets an authorized user recover that key.
    /// </summary>
    public class Envelope
    {
        public Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
        public DateTime CreatedAt { get; set; }

        public User? Patient { get; set; }
        public User? User { get; set; }
    }
}