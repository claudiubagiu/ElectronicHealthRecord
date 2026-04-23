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

            var draftId = Guid.NewGuid();

            var envelopes = new List<DiagnosticDraftEnvelope>();
            foreach (var e in dto.Envelopes)
            {
                envelopes.Add(new DiagnosticDraftEnvelope
                {
                    Id = Guid.NewGuid(),
                    DiagnosticDraftId = draftId,
                    UserId = e.UserId,
                    EncryptedAesKey = e.EncryptedAesKey
                });
            }

            var draft = new DiagnosticDraft
            {
                Id = draftId,
                Status = "Draft",
                PatientId = dto.PatientId,
                PatientWalletAddress = dto.PatientWalletAddress,
                CreatedByAssistantId = callerId,
                CompletedByDoctorId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EncryptedData = dto.EncryptedData,
                Iv = dto.Iv,
                LinkedMedicalRecordIds = dto.LinkedMedicalRecordIds,
                Envelopes = envelopes
            };

            var created = await _draftRepository.CreateAsync(draft);
            return Result.Ok(MapToDto(created));
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

            return Result.Ok(MapToDto(draft));
        }

        public async Task<Result<DiagnosticDraftDto>> UpdateAsync(Guid draftId, Guid callerId, UpdateDiagnosticDraftDto dto)
        {
            var draft = await _draftRepository.GetByIdAsync(draftId);
            if (draft == null)
                return Result.Fail<DiagnosticDraftDto>(
                    new Error("Draft not found.").WithMetadata("StatusCode", 404));

            draft.EncryptedData = dto.EncryptedData;
            draft.Iv = dto.Iv;
            draft.LinkedMedicalRecordIds = dto.LinkedMedicalRecordIds;
            draft.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(dto.Status))
                draft.Status = dto.Status;

            if (dto.CompletedByDoctorId.HasValue)
                draft.CompletedByDoctorId = dto.CompletedByDoctorId;

            var updatedEnvelopes = new List<DiagnosticDraftEnvelope>();
            foreach (var e in dto.Envelopes)
            {
                updatedEnvelopes.Add(new DiagnosticDraftEnvelope
                {
                    Id = Guid.NewGuid(),
                    DiagnosticDraftId = draft.Id,
                    UserId = e.UserId,
                    EncryptedAesKey = e.EncryptedAesKey
                });
            }
            draft.Envelopes = updatedEnvelopes;

            var updated = await _draftRepository.UpdateAsync(draft);
            return Result.Ok(MapToDto(updated));
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

        private static DiagnosticDraftDto MapToDto(DiagnosticDraft draft) => new()
        {
            Id = draft.Id,
            Status = draft.Status,
            PatientId = draft.PatientId,
            PatientWalletAddress = draft.PatientWalletAddress,
            CreatedByAssistantId = draft.CreatedByAssistantId,
            CompletedByDoctorId = draft.CompletedByDoctorId,
            CreatedAt = draft.CreatedAt,
            UpdatedAt = draft.UpdatedAt,
            EncryptedData = draft.EncryptedData,
            Iv = draft.Iv,
            LinkedMedicalRecordIds = draft.LinkedMedicalRecordIds,
            Envelopes = draft.Envelopes.Select(e => new DiagnosticDraftEnvelopeDto
            {
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList()
        };
    }
}