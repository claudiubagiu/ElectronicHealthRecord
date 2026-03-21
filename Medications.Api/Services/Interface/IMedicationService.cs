using Medications.Api.Models.DTOs;
using FluentResults;

namespace Medications.Api.Services.Interface
{
    public interface IMedicationService
    {
        Task<Result<MedicationDto>> CreateAsync(Guid doctorId, CreateMedicationDto dto);
        Task<Result<IReadOnlyList<MedicationDto>>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId);
        Task<Result> AddEnvelopesBulkAsync(Guid requestingUserId, BulkEnvelopeDto dto);
        Task<Result> DeleteEnvelopesAsync(Guid requestingUserId, Guid doctorId, Guid patientId);
    }
}