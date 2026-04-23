using MedicalData.Api.Models.DTOs;
using FluentResults;

namespace MedicalData.Api.Services.Interface
{
    public interface IMedicalRecordService
    {
        Task<Result<MedicalRecordDto>> CreateAsync(Guid doctorId, CreateMedicalRecordDto dto);
        Task<Result<IReadOnlyList<MedicalRecordDto>>> GetByPatientIdAsync(Guid patientId, Guid requestingUserId);
        Task<Result<MedicalRecordDto>> UpdateAsync(Guid recordId, Guid requestingUserId, UpdateMedicalRecordDto dto);
        Task<Result> DeleteAsync(Guid recordId, Guid requestingUserId);
        Task<Result> AddEnvelopesBulkAsync(Guid requestingUserId, BulkEnvelopeDto dto);
        Task<Result> DeleteEnvelopesAsync(Guid requestingUserId, Guid doctorId, Guid patientId);
        Task DeleteEnvelopesInternalAsync(Guid doctorId, Guid patientId);
    }
}