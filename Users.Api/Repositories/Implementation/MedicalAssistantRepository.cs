using Microsoft.EntityFrameworkCore;
using Users.Api.Data;
using Users.Api.Models.Domain;
using Users.Api.Repositories.Interface;

namespace Users.Api.Repositories.Implementation
{
    public class MedicalAssistantsRepository : IMedicalAssistantsRepository
    {
        private readonly UsersDbContext _dbContext;

        public MedicalAssistantsRepository(UsersDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<MedicalAssistant> CreateAsync(MedicalAssistant medicalAssistant)
        {
            await _dbContext.MedicalAssistants.AddAsync(medicalAssistant);
            await _dbContext.SaveChangesAsync();
            return medicalAssistant;
        }

        public async Task<MedicalAssistant?> GetByIdAsync(Guid id)
        {
            return await _dbContext.MedicalAssistants
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<MedicalAssistant?> GetByIdentityIdAsync(string identityId) // NOU
        {
            return await _dbContext.MedicalAssistants
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.IdentityId == identityId);
        }
    }
}