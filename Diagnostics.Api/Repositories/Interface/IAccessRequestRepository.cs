using Diagnostics.Api.Models.Domain;

namespace Diagnostics.Api.Repositories.Interface
{
    public interface IAccessRequestRepository
    {
        Task<DiagnosticsAccessRequest> CreateAsync(DiagnosticsAccessRequest request);
        Task<DiagnosticsAccessRequest?> GetByIdAsync(Guid id);
        Task<DiagnosticsAccessRequest?> GetPendingAsync(Guid doctorId, Guid patientId);
        Task<IReadOnlyList<DiagnosticsAccessRequest>> GetByPatientIdAsync(Guid patientId);
        Task<IReadOnlyList<DiagnosticsAccessRequest>> GetByDoctorIdAsync(Guid doctorId);
        Task<DiagnosticsAccessRequest> UpdateAsync(DiagnosticsAccessRequest request);

    }
}
