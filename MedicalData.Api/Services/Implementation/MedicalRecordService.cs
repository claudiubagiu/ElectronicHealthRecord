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
                UpdatedAt = now
            };

            var created = await _recordRepository.CreateAsync(record);

            return Result.Ok(MapToDto(created));
        }

        public async Task<Result<IReadOnlyList<MedicalRecordDto>>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<MedicalRecordDto>>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var records = await _recordRepository.GetByPatientIdAsync(patientId);

            var dtos = records.Select(MapToDto).ToList();

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

            var updated = await _recordRepository.UpdateAsync(record);

            return Result.Ok(MapToDto(updated));
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

        private static MedicalRecordDto MapToDto(MedicalRecord record) => new()
        {
            Id = record.Id,
            PatientId = record.PatientId,
            RecordType = record.RecordType,
            EncryptedData = record.EncryptedData,
            Iv = record.Iv,
            CreatedByDoctorId = record.CreatedByDoctorId,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt
        };
    }
}