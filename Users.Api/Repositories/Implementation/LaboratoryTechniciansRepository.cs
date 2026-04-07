using Microsoft.EntityFrameworkCore;
using Users.Api.Data;
using Users.Api.Models.Domain;
using Users.Api.Repositories.Interface;

namespace Users.Api.Repositories.Implementation
{
    public class LaboratoryTechniciansRepository : ILaboratoryTechniciansRepository
    {
        private readonly UsersDbContext dbContext;

        public LaboratoryTechniciansRepository(UsersDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<LaboratoryTechnician> CreateAsync(LaboratoryTechnician labTechnician)
        {
            await dbContext.LaboratoryTechnicians.AddAsync(labTechnician);
            await dbContext.SaveChangesAsync();
            return labTechnician;
        }

        public async Task<LaboratoryTechnician?> DeleteAsync(LaboratoryTechnician labTechnician)
        {
            dbContext.LaboratoryTechnicians.Remove(labTechnician);
            await dbContext.SaveChangesAsync();
            return labTechnician;
        }

        public async Task<IReadOnlyList<LaboratoryTechnician>> GetAllAsync()
        {
            return await dbContext.LaboratoryTechnicians.AsNoTracking().ToListAsync();
        }

        public async Task<LaboratoryTechnician?> GetByIdAsync(Guid id)
        {
            return await dbContext.LaboratoryTechnicians.AsNoTracking().FirstOrDefaultAsync(lt => lt.Id == id);
        }

        public async Task<LaboratoryTechnician?> GetByIdentityIdAsync(string identityId)
        {
            return await dbContext.LaboratoryTechnicians.AsNoTracking().FirstOrDefaultAsync(lt => lt.IdentityId == identityId);
        }

        public async Task<LaboratoryTechnician?> UpdateAsync(LaboratoryTechnician labTechnician)
        {
            var existing = dbContext.LaboratoryTechnicians.FirstOrDefault(lt => lt.Id == labTechnician.Id);
            if (existing == null) return null;

            dbContext.Entry(existing).CurrentValues.SetValues(labTechnician);
            await dbContext.SaveChangesAsync();
            return existing;
        }
    }
}