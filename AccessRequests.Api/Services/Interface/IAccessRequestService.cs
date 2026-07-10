using AccessRequests.Api.Models.DTOs;
using FluentResults;

namespace AccessRequests.Api.Services.Interface
{
    public interface IAccessRequestService
    {
        Task<Result<AccessRequestDto>> CreateAsync(Guid doctorId, CreateAccessRequestDto request);
        Task<Result<IReadOnlyList<AccessRequestDto>>> GetByPatientIdAsync(Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestDto>>> GetByDoctorIdAsync(Guid doctorId);
        Task<Result<AccessRequestDto>> ApproveAsync(Guid requestId, Guid patientId, CreateEnvelopeDto envelope);
        Task<Result<AccessRequestDto>> RejectAsync(Guid requestId, Guid patientId);
        Task<Result<AccessRequestDto>> RevokeAsync(Guid requestId, Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByPatientIdAsync(Guid patientId);
        Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByDoctorIdAsync(Guid doctorId);
        Task<int> ExpireOverdueRequestsAsync();
        Task<Result<IReadOnlyList<AccessRequestDto>>> GetApprovedByPatientIdAsync(Guid patientId);
        Task<Result<EnvelopeDto>> GetEnvelopeAsync(Guid patientId, Guid userId);
        Task<Result<int>> RotateEnvelopesAsync(Guid patientId, RotateEnvelopesDto dto);
    }
}