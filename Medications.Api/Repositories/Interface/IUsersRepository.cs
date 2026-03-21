using Medications.Api.Models.Domain;

namespace Medications.Api.Repositories.Interface
{
    public interface IUsersRepository
    {
        Task<User> CreateAsync(User user);
        Task<bool> ExistsAsync(Guid id);
    }
}