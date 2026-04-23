namespace Diagnostics.Api.Models.DTOs
{
    public class UpdateDiagnosticDraftDto
    {
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public string LinkedMedicalRecordIds { get; set; } = string.Empty;
        public string? Status { get; set; }
        public Guid? CompletedByDoctorId { get; set; }
        public List<DiagnosticDraftEnvelopeDto> Envelopes { get; set; } = new();
    }
}