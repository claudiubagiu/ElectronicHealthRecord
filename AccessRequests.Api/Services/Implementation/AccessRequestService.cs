using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.DTOs;
using AccessRequests.Api.Repositories.Interface;
using AccessRequests.Api.Services.Interface;
using FluentResults;

namespace AccessRequests.Api.Services.Implementation
{
    public class AccessRequestService : IAccessRequestService
    {
        private readonly IAccessRequestRepository _accessRequestRepository;
        private readonly IAccessRequestHistoryRepository _historyRepository;
        private readonly IUsersRepository _usersRepository;
        private readonly IEnvelopeRepository _envelopeRepository;

        private static readonly TimeSpan AccessDuration = TimeSpan.FromDays(7);

        public AccessRequestService(
            IAccessRequestRepository accessRequestRepository,
            IAccessRequestHistoryRepository historyRepository,
            IUsersRepository usersRepository,
            IEnvelopeRepository envelopeRepository)
        {
            _accessRequestRepository = accessRequestRepository;
            _historyRepository = historyRepository;
            _usersRepository = usersRepository;
            _envelopeRepository = envelopeRepository;
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

            var accessRequest = new Models.Domain.AccessRequest
            {
                Id = Guid.NewGuid(),
                DoctorId = doctorId,
                PatientId = request.PatientId,
                Status = AccessRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            accessRequest = await _accessRequestRepository.CreateAsync(accessRequest);

            await _historyRepository.CreateAsync(new AccessRequestHistory
            {
                Id = Guid.NewGuid(),
                AccessRequestId = accessRequest.Id,
                Action = "Requested",
                Timestamp = DateTime.UtcNow
            });

            var created = await _accessRequestRepository.GetByIdAsync(accessRequest.Id);
            return Result.Ok(MapToDto(created!));
        }

        public async Task<Result<AccessRequestDto>> ApproveAsync(Guid requestId, Guid patientId, CreateEnvelopeDto envelope)
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

            if (string.IsNullOrWhiteSpace(envelope?.EncryptedAesKey))
                return Result.Fail<AccessRequestDto>(
                    new Error("An encrypted AES key envelope is required to approve access.")
                        .WithMetadata("StatusCode", 400));

            var now = DateTime.UtcNow;
            request.Status = AccessRequestStatus.Approved;
            request.ApprovedAt = now;
            request.ExpiresAt = now.Add(AccessDuration);
            var updated = await _accessRequestRepository.UpdateAsync(request);

            // request.DoctorId identifies the authorized user (doctor, lab tech,
            // pharmacist, medical assistant, etc.) this access request is for —
            // the column name is historical, the value is a generic user id.
            var authorizedUserId = request.DoctorId;

            // One envelope per (patient, user) — replace any stale leftover instead of duplicating.
            var existingEnvelope = await _envelopeRepository.GetByPatientAndUserAsync(request.PatientId, authorizedUserId);
            if (existingEnvelope != null)
            {
                await _envelopeRepository.DeleteAsync(existingEnvelope);
            }

            await _envelopeRepository.CreateAsync(new Envelope
            {
                Id = Guid.NewGuid(),
                PatientId = request.PatientId,
                UserId = authorizedUserId,
                EncryptedAesKey = envelope.EncryptedAesKey,
                CreatedAt = now
            });

            await _historyRepository.CreateAsync(new AccessRequestHistory
            {
                Id = Guid.NewGuid(),
                AccessRequestId = updated.Id,
                Action = "Approved",
                Timestamp = now
            });

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

            await _historyRepository.CreateAsync(new AccessRequestHistory
            {
                Id = Guid.NewGuid(),
                AccessRequestId = updated.Id,
                Action = "Rejected",
                Timestamp = DateTime.UtcNow
            });

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

            request.Status = AccessRequestStatus.Revoked;
            var updated = await _accessRequestRepository.UpdateAsync(request);

            await DeleteEnvelopeIfExistsAsync(request.PatientId, request.DoctorId);

            await _historyRepository.CreateAsync(new AccessRequestHistory
            {
                Id = Guid.NewGuid(),
                AccessRequestId = updated.Id,
                Action = "Revoked",
                Timestamp = DateTime.UtcNow
            });

            var result = await _accessRequestRepository.GetByIdAsync(updated.Id);
            return Result.Ok(MapToDto(result!));
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

        public async Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByPatientIdAsync(Guid patientId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<AccessRequestHistoryDto>>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var histories = await _historyRepository.GetByPatientIdAsync(patientId);
            return Result.Ok<IReadOnlyList<AccessRequestHistoryDto>>(histories.Select(MapHistoryToDto).ToList());
        }

        public async Task<Result<IReadOnlyList<AccessRequestHistoryDto>>> GetHistoryByDoctorIdAsync(Guid doctorId)
        {
            if (!await _usersRepository.ExistsAsync(doctorId))
                return Result.Fail<IReadOnlyList<AccessRequestHistoryDto>>(
                    new Error("Doctor not found.").WithMetadata("StatusCode", 404));

            var histories = await _historyRepository.GetByDoctorIdAsync(doctorId);
            return Result.Ok<IReadOnlyList<AccessRequestHistoryDto>>(histories.Select(MapHistoryToDto).ToList());
        }

        public async Task<int> ExpireOverdueRequestsAsync()
        {
            var expired = await _accessRequestRepository.GetExpiredApprovedAsync();

            foreach (var request in expired)
            {
                request.Status = AccessRequestStatus.Expired;
                await _accessRequestRepository.UpdateAsync(request);

                await DeleteEnvelopeIfExistsAsync(request.PatientId, request.DoctorId);

                await _historyRepository.CreateAsync(new AccessRequestHistory
                {
                    Id = Guid.NewGuid(),
                    AccessRequestId = request.Id,
                    Action = "Expired",
                    Timestamp = DateTime.UtcNow
                });
            }

            return expired.Count;
        }

        public async Task<Result<IReadOnlyList<AccessRequestDto>>> GetApprovedByPatientIdAsync(Guid patientId)
        {
            var requests = await _accessRequestRepository.GetApprovedByPatientIdAsync(patientId);
            return Result.Ok<IReadOnlyList<AccessRequestDto>>(requests.Select(MapToDto).ToList());
        }

        // ── Envelopes ────────────────────────────────────────────────────────

        public async Task<Result<EnvelopeDto>> GetEnvelopeAsync(Guid patientId, Guid userId)
        {
            var envelope = await _envelopeRepository.GetByPatientAndUserAsync(patientId, userId);
            if (envelope == null)
                return Result.Fail<EnvelopeDto>(
                    new Error("No envelope found for this patient/user pair. Access may not be approved.")
                        .WithMetadata("StatusCode", 404));

            return Result.Ok(MapEnvelopeToDto(envelope));
        }

        private async Task DeleteEnvelopeIfExistsAsync(Guid patientId, Guid userId)
        {
            var envelope = await _envelopeRepository.GetByPatientAndUserAsync(patientId, userId);
            if (envelope != null)
            {
                await _envelopeRepository.DeleteAsync(envelope);
            }
        }

        private static AccessRequestDto MapToDto(Models.Domain.AccessRequest r) => new()
        {
            Id = r.Id,
            DoctorId = r.DoctorId,
            DoctorName = r.Doctor != null ? $"{r.Doctor.FirstName} {r.Doctor.LastName}" : string.Empty,
            DoctorWalletAddress = r.Doctor?.WalletAddress ?? string.Empty,
            PatientId = r.PatientId,
            PatientName = r.Patient != null ? $"{r.Patient.FirstName} {r.Patient.LastName}" : string.Empty,
            PatientWalletAddress = r.Patient?.WalletAddress ?? string.Empty,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt,
            ApprovedAt = r.ApprovedAt,
            ExpiresAt = r.ExpiresAt
        };

        private static AccessRequestHistoryDto MapHistoryToDto(AccessRequestHistory h) => new()
        {
            Id = h.Id,
            AccessRequestId = h.AccessRequestId,
            Action = h.Action,
            DoctorId = h.AccessRequest?.DoctorId ?? Guid.Empty,
            DoctorName = h.AccessRequest?.Doctor != null
                ? $"{h.AccessRequest.Doctor.FirstName} {h.AccessRequest.Doctor.LastName}"
                : string.Empty,
            PatientId = h.AccessRequest?.PatientId ?? Guid.Empty,
            PatientName = h.AccessRequest?.Patient != null
                ? $"{h.AccessRequest.Patient.FirstName} {h.AccessRequest.Patient.LastName}"
                : string.Empty,
            Timestamp = h.Timestamp
        };

        private static EnvelopeDto MapEnvelopeToDto(Envelope e) => new()
        {
            Id = e.Id,
            PatientId = e.PatientId,
            UserId = e.UserId,
            EncryptedAesKey = e.EncryptedAesKey,
            CreatedAt = e.CreatedAt
        };
    }
}