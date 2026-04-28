using Diagnostics.Api.Models.Domain;

namespace Diagnostics.Api.Repositories.Interface
{
    public interface IUsersRepository
    {
        Task<User> CreateAsync(User user);
        Task<bool> ExistsAsync(Guid id);
        Task<User?> GetByIdAsync(Guid id);
    }
}