using Diagnostics.Api.Models.Domain;

namespace Diagnostics.Api.Repositories.Interface
{
    public interface IAccessRequestHistoryRepository
    {
        Task<AccessRequestHistory> CreateAsync(AccessRequestHistory history);
        Task<IReadOnlyList<AccessRequestHistory>> GetByAccessRequestIdAsync(Guid accessRequestId);
        Task<IReadOnlyList<AccessRequestHistory>> GetByPatientIdAsync(Guid patientId);
        Task<IReadOnlyList<AccessRequestHistory>> GetByDoctorIdAsync(Guid doctorId);
    }
}
