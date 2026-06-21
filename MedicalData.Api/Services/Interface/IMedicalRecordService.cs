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
        Task<Result<int>> RotateDocumentKeysAsync(Guid patientId, RotateDocumentKeysDto dto);
    }
}