using Users.Api.Models.Domain;

namespace Users.Api.Repositories.Interface
{
    public interface IDoctorsRepository
    {
        Task<Doctor> CreateAsync(Doctor doctor);
        Task<IReadOnlyList<Doctor>> GetAllAsync();
        Task<Doctor?> GetByIdAsync(Guid id);
        Task<Doctor?> GetByIdentityIdAsync(string identityId);
        Task<Doctor?> UpdateAsync(Doctor doctor);
        Task<Doctor?> DeleteAsync(Doctor doctor);
    }
}
