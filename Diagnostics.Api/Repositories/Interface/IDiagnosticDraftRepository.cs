using Diagnostics.Api.Models.Domain;

namespace Diagnostics.Api.Repositories.Interface
{
    public interface IDiagnosticDraftRepository
    {
        Task<DiagnosticDraft> CreateAsync(DiagnosticDraft draft);
        Task<DiagnosticDraft?> GetByIdAsync(Guid id);
        Task<DiagnosticDraft?> GetActiveByPatientIdAsync(Guid patientId);
        Task<DiagnosticDraft> UpdateAsync(DiagnosticDraft draft);
        Task<bool> DeleteAsync(Guid id);
        Task<int> UpdateDocumentKeysAsync(Guid patientId, IReadOnlyDictionary<Guid, string> draftIdToEncryptedDocumentKey);
    }
}