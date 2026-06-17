using AccessRequests.Api.Data;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Repositories.Implementation
{
    public class UsersRepository : IUsersRepository
    {
        private readonly AccessRequestDbContext _dbContext;

        public UsersRepository(AccessRequestDbContext dbContext)
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

        public async Task<User?> GetByIdAsync(Guid id)
        {
            return await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        }
    }
}
