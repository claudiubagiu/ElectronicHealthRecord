using Users.Api.Models.Domain;

namespace Users.Api.Repositories.Interface
{
    public interface IPatientsRepository
    {
        Task<Patient> CreateAsync(Patient patient);
        Task<IReadOnlyList<Patient>> GetAllAsync();
        Task<Patient?> GetByIdAsync(Guid id);
        Task<Patient?> GetByIdentityIdAsync(string identityId);
        Task<Patient?> UpdateAsync(Patient patient);
        Task<Patient?> DeleteAsync(Patient patient);
    }
}
