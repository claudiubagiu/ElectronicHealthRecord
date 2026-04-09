using Users.Api.Models.Domain;

namespace Users.Api.Repositories.Interface
{
    public interface IPharmacistsRepository
    {
        Task<Pharmacist> CreateAsync(Pharmacist pharmacist);
        Task<Pharmacist?> GetByIdAsync(Guid id);
        Task<Pharmacist?> GetByIdentityIdAsync(string identityId);
        Task<IReadOnlyList<Pharmacist>> GetAllAsync();
        Task<Pharmacist?> UpdateAsync(Pharmacist pharmacist);
        Task<Pharmacist?> DeleteAsync(Pharmacist pharmacist);
    }
}