namespace AccessRequests.Api.Models.Domain
{
    /// <summary>
    /// Holds the per-document DocumentKey (AES-GCM), encrypted with the
    /// patient's PatientMasterKey, for a single document stored on IPFS
    /// (a diagnosis PDF, a lab analysis result, etc.).
    ///
    /// One DocumentKey row per IpfsCid. Whoever can prove they hold a
    /// valid PatientMasterKey for PatientId — the patient themselves, or
    /// any user with an active Envelope for that patient — can unwrap
    /// EncryptedDocumentKey locally and decrypt the file at IpfsCid.
    ///
    /// This is the IPFS-backed counterpart to MedicalRecord.EncryptedDocumentKey
    /// and DiagnosticDraft.EncryptedDocumentKey, which live directly in their
    /// own services' databases. Documents on IPFS are content-addressed and
    /// immutable, so their DocumentKey can't be stored alongside them — it
    /// lives here instead, where it can be rotated without touching IPFS.
    /// </summary>
    public class DocumentKey
    {
        public Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required string IpfsCid { get; set; }
        public required string EncryptedDocumentKey { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public User? Patient { get; set; }
    }
}