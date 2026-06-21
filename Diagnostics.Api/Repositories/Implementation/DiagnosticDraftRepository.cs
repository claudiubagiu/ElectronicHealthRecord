using Diagnostics.Api.Data;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace Diagnostics.Api.Repositories.Implementation
{
    public class DiagnosticDraftRepository : IDiagnosticDraftRepository
    {
        private readonly DiagnosticsDbContext _dbContext;

        public DiagnosticDraftRepository(DiagnosticsDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<DiagnosticDraft> CreateAsync(DiagnosticDraft draft)
        {
            await _dbContext.DiagnosticDrafts.AddAsync(draft);
            await _dbContext.SaveChangesAsync();
            return draft;
        }

        public async Task<DiagnosticDraft?> GetByIdAsync(Guid id)
        {
            return await _dbContext.DiagnosticDrafts
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<DiagnosticDraft?> GetActiveByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.DiagnosticDrafts
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.PatientId == patientId && d.Status == "Draft");
        }

        public async Task<DiagnosticDraft> UpdateAsync(DiagnosticDraft draft)
        {
            var existing = await _dbContext.DiagnosticDrafts.FindAsync(draft.Id);
            if (existing == null)
                throw new InvalidOperationException($"DiagnosticDraft {draft.Id} not found.");

            existing.EncryptedData = draft.EncryptedData;
            existing.Iv = draft.Iv;
            existing.EncryptedDocumentKey = draft.EncryptedDocumentKey;
            existing.LinkedMedicalRecordIds = draft.LinkedMedicalRecordIds;
            existing.UpdatedAt = draft.UpdatedAt;

            if (!string.IsNullOrWhiteSpace(draft.Status))
                existing.Status = draft.Status;

            if (draft.CompletedByDoctorId.HasValue)
                existing.CompletedByDoctorId = draft.CompletedByDoctorId;

            await _dbContext.SaveChangesAsync();

            return existing;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var draft = await _dbContext.DiagnosticDrafts.FindAsync(id);
            if (draft == null) return false;

            _dbContext.DiagnosticDrafts.Remove(draft);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Batch-updates only EncryptedDocumentKey for the given drafts,
        /// scoped to patientId for safety. Used during PatientMasterKey
        /// rotation — EncryptedData/Iv are never touched here.
        /// </summary>
        public async Task<int> UpdateDocumentKeysAsync(
            Guid patientId,
            IReadOnlyDictionary<Guid, string> draftIdToEncryptedDocumentKey)
        {
            if (draftIdToEncryptedDocumentKey.Count == 0) return 0;

            var ids = draftIdToEncryptedDocumentKey.Keys.ToList();

            var drafts = await _dbContext.DiagnosticDrafts
                .Where(d => d.PatientId == patientId && ids.Contains(d.Id))
                .ToListAsync();

            var now = DateTime.UtcNow;
            foreach (var draft in drafts)
            {
                draft.EncryptedDocumentKey = draftIdToEncryptedDocumentKey[draft.Id];
                draft.UpdatedAt = now;
            }

            await _dbContext.SaveChangesAsync();

            return drafts.Count;
        }
    }
}