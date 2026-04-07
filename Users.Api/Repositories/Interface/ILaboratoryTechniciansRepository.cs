using Users.Api.Models.Domain;

namespace Users.Api.Repositories.Interface
{
    public interface ILaboratoryTechniciansRepository
    {
        Task<LaboratoryTechnician> CreateAsync(LaboratoryTechnician labTechnician);
        Task<LaboratoryTechnician?> GetByIdAsync(Guid id);
        Task<LaboratoryTechnician?> GetByIdentityIdAsync(string identityId);
        Task<IReadOnlyList<LaboratoryTechnician>> GetAllAsync();
        Task<LaboratoryTechnician?> UpdateAsync(LaboratoryTechnician labTechnician);
        Task<LaboratoryTechnician?> DeleteAsync(LaboratoryTechnician labTechnician);
    }
}