using FluentResults;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Models.DTOs;
using MedicalData.Api.Repositories.Interface;
using MedicalData.Api.Services.Interface;

namespace MedicalData.Api.Services.Implementation
{
    public class MedicalRecordService : IMedicalRecordService
    {
        private readonly IMedicalRecordRepository _recordRepository;
        private readonly IUsersRepository _usersRepository;

        public MedicalRecordService(
            IMedicalRecordRepository recordRepository,
            IUsersRepository usersRepository)
        {
            _recordRepository = recordRepository;
            _usersRepository = usersRepository;
        }

        public async Task<Result<MedicalRecordDto>> CreateAsync(Guid doctorId, CreateMedicalRecordDto dto)
        {
            if (!await _usersRepository.ExistsAsync(dto.PatientId))
                return Result.Fail<MedicalRecordDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            if (!await _usersRepository.ExistsAsync(doctorId))
                return Result.Fail<MedicalRecordDto>(
                    new Error("Doctor not found.").WithMetadata("StatusCode", 404));

            var now = DateTime.UtcNow;
            var record = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                PatientId = dto.PatientId,
                RecordType = dto.RecordType,
                EncryptedData = dto.EncryptedData,
                Iv = dto.Iv,
                CreatedByDoctorId = doctorId,
                CreatedAt = now,
                UpdatedAt = now,
                Envelopes = dto.Envelopes.Select(e => new MedicalRecordEnvelope
                {
                    Id = Guid.NewGuid(),
                    UserId = e.UserId,
                    EncryptedAesKey = e.EncryptedAesKey
                }).ToList()
            };

            var created = await _recordRepository.CreateAsync(record);

            return Result.Ok(new MedicalRecordDto
            {
                Id = created.Id,
                PatientId = created.PatientId,
                RecordType = created.RecordType,
                EncryptedData = created.EncryptedData,
                Iv = created.Iv,
                CreatedByDoctorId = created.CreatedByDoctorId,
                CreatedAt = created.CreatedAt,
                UpdatedAt = created.UpdatedAt,
                EncryptedAesKey = created.Envelopes
                    .FirstOrDefault(e => e.UserId == doctorId)?.EncryptedAesKey
            });
        }

        public async Task<Result<IReadOnlyList<MedicalRecordDto>>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<MedicalRecordDto>>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var records = await _recordRepository.GetByPatientIdAsync(patientId, requestingUserId);

            var dtos = records.Select(m => new MedicalRecordDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                RecordType = m.RecordType,
                EncryptedData = m.EncryptedData,
                Iv = m.Iv,
                CreatedByDoctorId = m.CreatedByDoctorId,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                EncryptedAesKey = m.Envelopes.FirstOrDefault()?.EncryptedAesKey
            }).ToList();

            return Result.Ok<IReadOnlyList<MedicalRecordDto>>(dtos);
        }

        public async Task<Result<MedicalRecordDto>> UpdateAsync(
            Guid recordId, Guid requestingUserId, UpdateMedicalRecordDto dto)
        {
            var record = await _recordRepository.GetByIdAsync(recordId);
            if (record == null)
                return Result.Fail<MedicalRecordDto>(
                    new Error("Record not found.").WithMetadata("StatusCode", 404));

            record.RecordType = dto.RecordType;
            record.EncryptedData = dto.EncryptedData;
            record.Iv = dto.Iv;
            record.UpdatedAt = DateTime.UtcNow;
            record.Envelopes = dto.Envelopes.Select(e => new MedicalRecordEnvelope
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList();

            var updated = await _recordRepository.UpdateAsync(record);

            return Result.Ok(new MedicalRecordDto
            {
                Id = updated.Id,
                PatientId = updated.PatientId,
                RecordType = updated.RecordType,
                EncryptedData = updated.EncryptedData,
                Iv = updated.Iv,
                CreatedByDoctorId = updated.CreatedByDoctorId,
                CreatedAt = updated.CreatedAt,
                UpdatedAt = updated.UpdatedAt,
                EncryptedAesKey = updated.Envelopes
                    .FirstOrDefault(e => e.UserId == requestingUserId)?.EncryptedAesKey
            });
        }

        public async Task<Result> DeleteAsync(Guid recordId, Guid requestingUserId)
        {
            var record = await _recordRepository.GetByIdAsync(recordId);
            if (record == null)
                return Result.Fail(
                    new Error("Record not found.").WithMetadata("StatusCode", 404));

            var deleted = await _recordRepository.DeleteAsync(recordId);
            if (!deleted)
                return Result.Fail(
                    new Error("Failed to delete record.").WithMetadata("StatusCode", 500));

            return Result.Ok();
        }

        public async Task<Result> AddEnvelopesBulkAsync(Guid requestingUserId, BulkEnvelopeDto dto)
        {
            var envelopes = dto.Envelopes.Select(e => new MedicalRecordEnvelope
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = e.MedicalRecordId,
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList();

            await _recordRepository.AddEnvelopesAsync(envelopes);
            return Result.Ok();
        }

        public async Task<Result> DeleteEnvelopesAsync(
            Guid requestingUserId, Guid doctorId, Guid patientId)
        {
            if (requestingUserId != patientId)
                return Result.Fail(
                    new Error("Only the patient can revoke envelope access.")
                        .WithMetadata("StatusCode", 403));

            await _recordRepository.DeleteEnvelopesByUserAndPatientAsync(doctorId, patientId);
            return Result.Ok();
        }

        public async Task DeleteEnvelopesInternalAsync(Guid doctorId, Guid patientId)
        {
            await _recordRepository.DeleteEnvelopesByUserAndPatientAsync(doctorId, patientId);
        }
    }
}