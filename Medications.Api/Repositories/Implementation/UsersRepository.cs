using Medications.Api.Data;
using Medications.Api.Models.Domain;
using Medications.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace Medications.Api.Repositories.Implementation
{
    public class UsersRepository : IUsersRepository
    {
        private readonly MedicationsDbContext _dbContext;

        public UsersRepository(MedicationsDbContext dbContext)
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