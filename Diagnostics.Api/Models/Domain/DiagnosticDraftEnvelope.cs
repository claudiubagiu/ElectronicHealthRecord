namespace Diagnostics.Api.Models.Domain
{
    public class DiagnosticDraftEnvelope
    {
        public required Guid Id { get; set; }
        public required Guid DiagnosticDraftId { get; set; }
        public required string UserId { get; set; }
        public required string EncryptedAesKey { get; set; }

        public DiagnosticDraft? DiagnosticDraft { get; set; }
    }
}