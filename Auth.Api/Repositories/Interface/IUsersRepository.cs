using Auth.Api.Models.Domain;

namespace Auth.Api.Repositories.Interface
{
    public interface IUsersRepository
    {
        Task<User> CreateAsync(User user);
    }
}
