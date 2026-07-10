using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Models.Messages;

namespace Diagnostics.Api.Mappings
{
    public static class Mapper
    {
        // ───────────────────────── UserCreatedEvent → User ─────────────────────────

        public static User ToUser(UserCreatedEvent evt) => new()
        {
            Id = evt.Id,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            Role = evt.Role,
            PublicKey = evt.PublicKey,
            EncryptedAesKey = evt.EncryptedAesKey,
        };

        // ───────────────────────── DiagnosticDraft → DiagnosticDraftDto ─────────────────────────

        public static DiagnosticDraftDto ToDiagnosticDraftDto(DiagnosticDraft draft, string? assistantName) => new()
        {
            Id = draft.Id,
            Status = draft.Status,
            PatientId = draft.PatientId,
            PatientWalletAddress = draft.PatientWalletAddress,
            CreatedByAssistantId = draft.CreatedByAssistantId,
            CreatedByAssistantName = assistantName,
            CompletedByDoctorId = draft.CompletedByDoctorId,
            CreatedAt = draft.CreatedAt,
            UpdatedAt = draft.UpdatedAt,
            EncryptedData = draft.EncryptedData,
            Iv = draft.Iv,
            EncryptedDocumentKey = draft.EncryptedDocumentKey,
            LinkedMedicalRecordIds = draft.LinkedMedicalRecordIds
        };
    }
}