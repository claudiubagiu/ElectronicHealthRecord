namespace Diagnostics.Api.Models.DTOs
{
    public class CreateDiagnosticDraftDto
    {
        public required Guid PatientId { get; set; }
        public required string PatientWalletAddress { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public string LinkedMedicalRecordIds { get; set; } = string.Empty;
    }
}