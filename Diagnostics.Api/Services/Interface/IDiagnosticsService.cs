using Diagnostics.Api.Models.DTOs;
using FluentResults;

namespace Diagnostics.Api.Services.Interface
{
    public interface IDiagnosticsService
    {
        Task<Result<DiagnosticDto>> CreateAsync(CreateDiagnosticRequestDto request);
        Task<Result<IReadOnlyList<DiagnosticDto>>> GetAllByPatientIdAsync(Guid patientId);
        Task<Result<bool>> DeleteByIdAsync(Guid id);
        Task<Result<FileDto>> GetFileByIdAsync(Guid id);
    }
}
