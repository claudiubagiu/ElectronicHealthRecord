using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Repositories.Interface;
using Diagnostics.Api.Services.Interface;
using FluentResults;

namespace Diagnostics.Api.Services.Implementation
{
    public class DiagnosticDraftService : IDiagnosticDraftService
    {
        private readonly IDiagnosticDraftRepository _draftRepository;
        private readonly IUsersRepository _usersRepository;

        public DiagnosticDraftService(
            IDiagnosticDraftRepository draftRepository,
            IUsersRepository usersRepository)
        {
            _draftRepository = draftRepository;
            _usersRepository = usersRepository;
        }

        public async Task<Result<DiagnosticDraftDto>> CreateAsync(Guid callerId, CreateDiagnosticDraftDto dto)
        {
            if (!await _usersRepository.ExistsAsync(dto.PatientId))
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var existing = await _draftRepository.GetActiveByPatientIdAsync(dto.PatientId);
            if (existing != null)
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("An active draft already exists for this patient.").WithMetadata("StatusCode", 409));

            var draft = new DiagnosticDraft
            {
                Id = Guid.NewGuid(),
                Status = "Draft",
                PatientId = dto.PatientId,
                PatientWalletAddress = dto.PatientWalletAddress,
                CreatedByAssistantId = callerId,
                CompletedByDoctorId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EncryptedData = dto.EncryptedData,
                Iv = dto.Iv,
                EncryptedDocumentKey = dto.EncryptedDocumentKey,
                LinkedMedicalRecordIds = dto.LinkedMedicalRecordIds
            };

            var created = await _draftRepository.CreateAsync(draft);

            var assistantName = await ResolveAssistantNameAsync(created.CreatedByAssistantId);
            return Result.Ok(MapToDto(created, assistantName));
        }

        public async Task<Result<DiagnosticDraftDto>> GetActiveByPatientIdAsync(Guid patientId, Guid callerId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var draft = await _draftRepository.GetActiveByPatientIdAsync(patientId);
            if (draft == null)
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("No active draft found for this patient.").WithMetadata("StatusCode", 404));

            var assistantName = await ResolveAssistantNameAsync(draft.CreatedByAssistantId);
            return Result.Ok(MapToDto(draft, assistantName));
        }

        public async Task<Result<DiagnosticDraftDto>> UpdateAsync(Guid draftId, Guid callerId, UpdateDiagnosticDraftDto dto)
        {
            var draft = await _draftRepository.GetByIdAsync(draftId);
            if (draft == null)
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("Draft not found.").WithMetadata("StatusCode", 404));

            draft.EncryptedData = dto.EncryptedData;
            draft.Iv = dto.Iv;
            draft.EncryptedDocumentKey = dto.EncryptedDocumentKey;
            draft.LinkedMedicalRecordIds = dto.LinkedMedicalRecordIds;
            draft.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(dto.Status))
                draft.Status = dto.Status;

            if (dto.CompletedByDoctorId.HasValue)
                draft.CompletedByDoctorId = dto.CompletedByDoctorId;

            var updated = await _draftRepository.UpdateAsync(draft);
            var assistantName = await ResolveAssistantNameAsync(updated.CreatedByAssistantId);
            return Result.Ok(MapToDto(updated, assistantName));
        }

        public async Task<Result> DeleteAsync(Guid draftId, Guid callerId)
        {
            var draft = await _draftRepository.GetByIdAsync(draftId);
            if (draft == null)
                return Result.Fail(
                    new Error("Draft not found.").WithMetadata("StatusCode", 404));

            var deleted = await _draftRepository.DeleteAsync(draftId);
            if (!deleted)
                return Result.Fail(
                    new Error("Failed to delete draft.").WithMetadata("StatusCode", 500));

            return Result.Ok();
        }

        /// <summary>
        /// Batch re-wraps DocumentKeys under a new PatientMasterKey, used
        /// when the patient rotates their master key. Only
        /// EncryptedDocumentKey changes — EncryptedData/Iv are left
        /// untouched. requestingUserId (patientId here) must be the patient
        /// themselves — only they hold the old and new PatientMasterKey.
        /// </summary>
        public async Task<Result<int>> RotateDocumentKeysAsync(Guid patientId, RotateDocumentKeysDto dto)
        {
            if (dto.Entries == null || dto.Entries.Count == 0)
                return Result.Fail<int>(
                    new Error("At least one entry is required.").WithMetadata("StatusCode", 400));

            if (dto.Entries.Any(e => string.IsNullOrWhiteSpace(e.EncryptedDocumentKey)))
                return Result.Fail<int>(
                    new Error("EncryptedDocumentKey is required for every entry.").WithMetadata("StatusCode", 400));

            var map = dto.Entries.ToDictionary(e => e.DraftId, e => e.EncryptedDocumentKey);

            var updatedCount = await _draftRepository.UpdateDocumentKeysAsync(patientId, map);

            return Result.Ok(updatedCount);
        }

        private async Task<string?> ResolveAssistantNameAsync(Guid? assistantId)
        {
            if (assistantId == null) return null;
            var user = await _usersRepository.GetByIdAsync(assistantId.Value);
            if (user == null) return null;
            return $"{user.FirstName} {user.LastName}";
        }

        private static DiagnosticDraftDto MapToDto(DiagnosticDraft draft, string? assistantName) => new()
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