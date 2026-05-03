using Users.Api.Models.Domain;

namespace Users.Api.Repositories.Interface
{
    public interface IMedicalAssistantsRepository
    {
        Task<MedicalAssistant> CreateAsync(MedicalAssistant medicalAssistant);
        Task<MedicalAssistant?> GetByIdAsync(Guid id);
        Task<MedicalAssistant?> GetByIdentityIdAsync(string identityId);
    }
}