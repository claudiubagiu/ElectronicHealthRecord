using Medications.Api.Models.Domain;
using Medications.Api.Models.DTOs;
using Medications.Api.Repositories.Interface;
using Medications.Api.Services.Interface;
using FluentResults;

namespace Medications.Api.Services.Implementation
{
    public class MedicationService : IMedicationService
    {
        private readonly IMedicationRepository _medicationRepository;
        private readonly IUsersRepository _usersRepository;

        public MedicationService(
            IMedicationRepository medicationRepository,
            IUsersRepository usersRepository)
        {
            _medicationRepository = medicationRepository;
            _usersRepository = usersRepository;
        }

        public async Task<Result<MedicationDto>> CreateAsync(Guid doctorId, CreateMedicationDto dto)
        {
            if (!await _usersRepository.ExistsAsync(dto.PatientId))
                return Result.Fail<MedicationDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            if (!await _usersRepository.ExistsAsync(doctorId))
                return Result.Fail<MedicationDto>(
                    new Error("Doctor not found.").WithMetadata("StatusCode", 404));

            var now = DateTime.UtcNow;
            var medication = new Medication
            {
                Id = Guid.NewGuid(),
                PatientId = dto.PatientId,
                EncryptedData = dto.EncryptedData,
                Iv = dto.Iv,
                CreatedByDoctorId = doctorId,
                CreatedAt = now,
                UpdatedAt = now,
                Envelopes = dto.Envelopes.Select(e => new MedicationEnvelope
                {
                    Id = Guid.NewGuid(),
                    UserId = e.UserId,
                    EncryptedAesKey = e.EncryptedAesKey
                }).ToList()
            };

            var created = await _medicationRepository.CreateAsync(medication);

            return Result.Ok(new MedicationDto
            {
                Id = created.Id,
                PatientId = created.PatientId,
                EncryptedData = created.EncryptedData,
                Iv = created.Iv,
                CreatedByDoctorId = created.CreatedByDoctorId,
                CreatedAt = created.CreatedAt,
                UpdatedAt = created.UpdatedAt,
                EncryptedAesKey = created.Envelopes
                    .FirstOrDefault(e => e.UserId == doctorId)?.EncryptedAesKey
            });
        }

        public async Task<Result<IReadOnlyList<MedicationDto>>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<MedicationDto>>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var medications = await _medicationRepository
                .GetByPatientIdAsync(patientId, requestingUserId);

            var dtos = medications.Select(m => new MedicationDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                EncryptedData = m.EncryptedData,
                Iv = m.Iv,
                CreatedByDoctorId = m.CreatedByDoctorId,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                EncryptedAesKey = m.Envelopes.FirstOrDefault()?.EncryptedAesKey
            }).ToList();

            return Result.Ok<IReadOnlyList<MedicationDto>>(dtos);
        }

        public async Task<Result> AddEnvelopesBulkAsync(Guid requestingUserId, BulkEnvelopeDto dto)
        {
            var envelopes = dto.Envelopes.Select(e => new MedicationEnvelope
            {
                Id = Guid.NewGuid(),
                MedicationId = e.MedicationId,
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList();

            await _medicationRepository.AddEnvelopesAsync(envelopes);
            return Result.Ok();
        }

        public async Task<Result> DeleteEnvelopesAsync(
            Guid requestingUserId, Guid doctorId, Guid patientId)
        {
            if (requestingUserId != patientId)
                return Result.Fail(
                    new Error("Only the patient can revoke envelope access.")
                        .WithMetadata("StatusCode", 403));

            await _medicationRepository.DeleteEnvelopesByUserAndPatientAsync(doctorId, patientId);
            return Result.Ok();
        }

        /// <inheritdoc />
        public async Task DeleteEnvelopesInternalAsync(Guid doctorId, Guid patientId)
        {
            await _medicationRepository.DeleteEnvelopesByUserAndPatientAsync(doctorId, patientId);
        }
    }
}