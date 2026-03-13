using Auth.Api.Data;
using Auth.Api.Models.Domain;
using Auth.Api.Repositories.Interface;

namespace Auth.Api.Repositories.Implementation
{
    public class UsersRepository : IUsersRepository
    {
        private readonly AuthDbContext _dbContext;
        public UsersRepository(AuthDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<User> CreateAsync(User user)
        {
            await _dbContext.Users.AddAsync(user);
            await _dbContext.SaveChangesAsync();
            return user;
        }
    }
}
