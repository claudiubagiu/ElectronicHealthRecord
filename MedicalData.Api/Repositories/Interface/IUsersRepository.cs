using MedicalData.Api.Models.Domain;

namespace MedicalData.Api.Repositories.Interface
{
    public interface IUsersRepository
    {
        Task<User> CreateAsync(User user);
        Task<bool> ExistsAsync(Guid id);
    }
}