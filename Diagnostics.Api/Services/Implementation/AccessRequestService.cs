using AutoMapper;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Repositories.Interface;
using Diagnostics.Api.Services.Interface;
using FluentResults;

namespace Diagnostics.Api.Services.Implementation
{
    public class AccessRequestService : IAccessRequestService
    {
        private readonly IAccessRequestRepository _accessRequestRepository;
        private readonly IUsersRepository _usersRepository;

        public AccessRequestService(
            IAccessRequestRepository accessRequestRepository,
            IUsersRepository usersRepository)
        {
            _accessRequestRepository = accessRequestRepository;
            _usersRepository = usersRepository;
        }

        public async Task<Result<AccessRequestDto>> CreateAsync(Guid doctorId, CreateAccessRequestDto request)
        {
            if (!await _usersRepository.ExistsAsync(doctorId))
                return Result.Fail<AccessRequestDto>(
                    new Error("Doctor not found.").WithMetadata("StatusCode", 404));

            if (!await _usersRepository.ExistsAsync(request.PatientId))
                return Result.Fail<AccessRequestDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var existing = await _accessRequestRepository.GetPendingAsync(doctorId, request.PatientId);
            if (existing != null)
                return Result.Fail<AccessRequestDto>(
                    new Error("An access request is already pending for this patient.")
                        .WithMetadata("StatusCode", 409));

            var accessRequest = new DiagnosticsAccessRequest
            {
                Id = Guid.NewGuid(),
                DoctorId = doctorId,
                PatientId = request.PatientId,
                Status = AccessRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            accessRequest = await _accessRequestRepository.CreateAsync(accessRequest);
            var created = await _accessRequestRepository.GetByIdAsync(accessRequest.Id);
            return Result.Ok(MapToDto(created!));
        }

        public async Task<Result<IReadOnlyList<AccessRequestDto>>> GetByPatientIdAsync(Guid patientId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<AccessRequestDto>>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var requests = await _accessRequestRepository.GetByPatientIdAsync(patientId);
            return Result.Ok<IReadOnlyList<AccessRequestDto>>(requests.Select(MapToDto).ToList());
        }

        public async Task<Result<IReadOnlyList<AccessRequestDto>>> GetByDoctorIdAsync(Guid doctorId)
        {
            if (!await _usersRepository.ExistsAsync(doctorId))
                return Result.Fail<IReadOnlyList<AccessRequestDto>>(
                    new Error("Doctor not found.").WithMetadata("StatusCode", 404));

            var requests = await _accessRequestRepository.GetByDoctorIdAsync(doctorId);
            return Result.Ok<IReadOnlyList<AccessRequestDto>>(requests.Select(MapToDto).ToList());
        }

        public async Task<Result<AccessRequestDto>> ApproveAsync(Guid requestId, Guid patientId)
        {
            var request = await _accessRequestRepository.GetByIdAsync(requestId);

            if (request == null)
                return Result.Fail<AccessRequestDto>(
                    new Error("Request not found.").WithMetadata("StatusCode", 404));

            if (request.PatientId != patientId)
                return Result.Fail<AccessRequestDto>(
                    new Error("Forbidden.").WithMetadata("StatusCode", 403));

            if (request.Status != AccessRequestStatus.Pending)
                return Result.Fail<AccessRequestDto>(
                    new Error("Request is no longer pending.").WithMetadata("StatusCode", 409));

            request.Status = AccessRequestStatus.Approved;
            var updated = await _accessRequestRepository.UpdateAsync(request);
            var result = await _accessRequestRepository.GetByIdAsync(updated.Id);
            return Result.Ok(MapToDto(result!));
        }

        public async Task<Result<AccessRequestDto>> RejectAsync(Guid requestId, Guid patientId)
        {
            var request = await _accessRequestRepository.GetByIdAsync(requestId);

            if (request == null)
                return Result.Fail<AccessRequestDto>(
                    new Error("Request not found.").WithMetadata("StatusCode", 404));

            if (request.PatientId != patientId)
                return Result.Fail<AccessRequestDto>(
                    new Error("Forbidden.").WithMetadata("StatusCode", 403));

            if (request.Status != AccessRequestStatus.Pending)
                return Result.Fail<AccessRequestDto>(
                    new Error("Request is no longer pending.").WithMetadata("StatusCode", 409));

            request.Status = AccessRequestStatus.Rejected;
            var updated = await _accessRequestRepository.UpdateAsync(request);
            var result = await _accessRequestRepository.GetByIdAsync(updated.Id);
            return Result.Ok(MapToDto(result!));
        }

        public async Task<Result<AccessRequestDto>> RevokeAsync(Guid requestId, Guid patientId)
        {
            var request = await _accessRequestRepository.GetByIdAsync(requestId);

            if (request == null)
                return Result.Fail<AccessRequestDto>(
                    new Error("Request not found.").WithMetadata("StatusCode", 404));

            if (request.PatientId != patientId)
                return Result.Fail<AccessRequestDto>(
                    new Error("Forbidden.").WithMetadata("StatusCode", 403));

            if (request.Status != AccessRequestStatus.Approved)
                return Result.Fail<AccessRequestDto>(
                    new Error("Only approved requests can be revoked.").WithMetadata("StatusCode", 409));

            request.Status = AccessRequestStatus.Rejected;
            var updated = await _accessRequestRepository.UpdateAsync(request);
            var result = await _accessRequestRepository.GetByIdAsync(updated.Id);
            return Result.Ok(MapToDto(result!));
        }

        private static AccessRequestDto MapToDto(DiagnosticsAccessRequest r) => new()
        {
            Id = r.Id,
            DoctorId = r.DoctorId,
            DoctorName = r.Doctor != null ? $"{r.Doctor.FirstName} {r.Doctor.LastName}" : string.Empty,
            DoctorWalletAddress = r.Doctor?.WalletAddress ?? string.Empty,
            PatientId = r.PatientId,
            PatientName = r.Patient != null ? $"{r.Patient.FirstName} {r.Patient.LastName}" : string.Empty,
            PatientWalletAddress = r.Patient?.WalletAddress ?? string.Empty,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt
        };
    }
}
