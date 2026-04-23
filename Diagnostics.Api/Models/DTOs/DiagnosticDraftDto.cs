namespace Diagnostics.Api.Models.DTOs
{
    public class DiagnosticDraftDto
    {
        public required Guid Id { get; set; }
        public required string Status { get; set; }
        public required Guid PatientId { get; set; }
        public required string PatientWalletAddress { get; set; }
        public Guid? CreatedByAssistantId { get; set; }
        public Guid? CompletedByDoctorId { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required DateTime UpdatedAt { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public string LinkedMedicalRecordIds { get; set; } = string.Empty;
        public List<DiagnosticDraftEnvelopeDto> Envelopes { get; set; } = new();
    }

    public class DiagnosticDraftEnvelopeDto
    {
        public required string UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}