namespace Diagnostics.Api.Models.Domain
{
    public class DiagnosticDraft
    {
        public required Guid Id { get; set; }
        public required string Status { get; set; } // "Draft" | "Completed"
        public required Guid PatientId { get; set; }
        public required string PatientWalletAddress { get; set; }
        public Guid? CreatedByAssistantId { get; set; }
        public Guid? CompletedByDoctorId { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required DateTime UpdatedAt { get; set; }

        // E2EE fields — same pattern as MedicalRecord
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }

        // IDs of Medical Data records marked as relevant for this consultation
        public string LinkedMedicalRecordIds { get; set; } = string.Empty; // JSON array stored as string

        // Navigation
        public User? Patient { get; set; }

        public ICollection<DiagnosticDraftEnvelope> Envelopes { get; set; } = new List<DiagnosticDraftEnvelope>();
    }
}