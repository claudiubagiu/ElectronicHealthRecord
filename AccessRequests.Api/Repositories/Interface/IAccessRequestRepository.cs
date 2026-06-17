using AccessRequests.Api.Models.Domain;

namespace AccessRequests.Api.Repositories.Interface
{
    public interface IAccessRequestRepository
    {
        Task<AccessRequest> CreateAsync(AccessRequest request);
        Task<AccessRequest?> GetByIdAsync(Guid id);
        Task<AccessRequest?> GetPendingAsync(Guid doctorId, Guid patientId);
        Task<IReadOnlyList<AccessRequest>> GetByPatientIdAsync(Guid patientId);
        Task<IReadOnlyList<AccessRequest>> GetByDoctorIdAsync(Guid doctorId);
        Task<AccessRequest> UpdateAsync(AccessRequest request);
        Task<IReadOnlyList<AccessRequest>> GetExpiredApprovedAsync();
        Task<IReadOnlyList<AccessRequest>> GetApprovedByPatientIdAsync(Guid patientId);
    }
}
