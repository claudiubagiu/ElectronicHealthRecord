using Diagnostics.Api.Models.DTOs;
using FluentResults;

namespace Diagnostics.Api.Services.Interface
{
    public interface IDiagnosticDraftService
    {
        Task<Result<DiagnosticDraftDto>> CreateAsync(Guid callerId, CreateDiagnosticDraftDto dto);
        Task<Result<DiagnosticDraftDto>> GetActiveByPatientIdAsync(Guid patientId, Guid callerId);
        Task<Result<DiagnosticDraftDto>> UpdateAsync(Guid draftId, Guid callerId, UpdateDiagnosticDraftDto dto);
        Task<Result> DeleteAsync(Guid draftId, Guid callerId);
        Task<Result<int>> RotateDocumentKeysAsync(Guid patientId, RotateDocumentKeysDto dto);
    }
}