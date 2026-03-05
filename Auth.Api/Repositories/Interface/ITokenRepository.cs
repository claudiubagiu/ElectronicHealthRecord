using Auth.Api.Domain.Models;

namespace Auth.Api.Repositories.Interface
{
    public interface ITokenRepository
    {
        string CreateToken(ApplicationUser user, List<string> roles);
    }
}
