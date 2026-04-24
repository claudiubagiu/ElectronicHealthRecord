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
                .Include(d => d.Envelopes)
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<DiagnosticDraft?> GetActiveByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.DiagnosticDrafts
                .Include(d => d.Envelopes)
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
            existing.LinkedMedicalRecordIds = draft.LinkedMedicalRecordIds;
            existing.UpdatedAt = draft.UpdatedAt;

            if (!string.IsNullOrWhiteSpace(draft.Status))
                existing.Status = draft.Status;

            if (draft.CompletedByDoctorId.HasValue)
                existing.CompletedByDoctorId = draft.CompletedByDoctorId;

            var oldEnvelopes = await _dbContext.DiagnosticDraftEnvelopes
                .Where(e => e.DiagnosticDraftId == draft.Id)
                .ToListAsync();

            _dbContext.DiagnosticDraftEnvelopes.RemoveRange(oldEnvelopes);

            var newEnvelopes = draft.Envelopes.Select(e => new DiagnosticDraftEnvelope
            {
                Id = Guid.NewGuid(),
                DiagnosticDraftId = draft.Id,
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList();

            await _dbContext.DiagnosticDraftEnvelopes.AddRangeAsync(newEnvelopes);

            await _dbContext.SaveChangesAsync();

            existing.Envelopes = newEnvelopes;
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
    }
}