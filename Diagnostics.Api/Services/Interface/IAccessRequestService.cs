using Diagnostics.Api.Models.DTOs;
using FluentResults;

namespace Diagnostics.Api.Services.Interface
{
    public interface IAccessRequestService
    {
        Task<Result<AccessRequestDto>> CreateAsync(Guid doctorId, CreateAccessRequestDto request);
        Task<Result<IReadOnlyList<AccessRequestDto>>> GetByPatientIdAsync(Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestDto>>> GetByDoctorIdAsync(Guid doctorId);
        Task<Result<AccessRequestDto>> ApproveAsync(Guid requestId, Guid patientId);
        Task<Result<AccessRequestDto>> RejectAsync(Guid requestId, Guid patientId);
        Task<Result<AccessRequestDto>> RevokeAsync(Guid requestId, Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByPatientIdAsync(Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByDoctorIdAsync(Guid doctorId);
    }
}
