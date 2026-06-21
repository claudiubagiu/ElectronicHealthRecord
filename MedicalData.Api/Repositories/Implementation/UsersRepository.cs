using MedicalData.Api.Data;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace MedicalData.Api.Repositories.Implementation
{
    public class UsersRepository : IUsersRepository
    {
        private readonly MedicalDataDbContext _dbContext;

        public UsersRepository(MedicalDataDbContext dbContext)
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

        public async Task<bool> UpdateEncryptedAesKeyAsync(Guid userId, string encryptedAesKey)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;

            user.EncryptedAesKey = encryptedAesKey;
            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}