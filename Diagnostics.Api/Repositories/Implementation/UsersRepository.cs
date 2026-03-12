using Diagnostics.Api.Data;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace Diagnostics.Api.Repositories.Implementation
{
    public class UsersRepository : IUsersRepository
    {
        private readonly DiagnosticsDbContext _dbContext;
        public UsersRepository(DiagnosticsDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<User> CreateAsync(User user)
        {
            await _dbContext.Users.AddAsync(user);
            await _dbContext.SaveChangesAsync();
            return user;
        }

        public async Task<bool> ExistsAsync(Guid userId)
        {
            return await _dbContext.Users.AnyAsync(u => u.Id == userId);
        }
    }
}
