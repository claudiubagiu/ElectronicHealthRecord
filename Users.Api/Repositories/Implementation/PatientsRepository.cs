using Microsoft.EntityFrameworkCore;
using Users.Api.Data;
using Users.Api.Models.Domain;
using Users.Api.Repositories.Interface;

namespace Users.Api.Repositories.Implementation
{
    public class PatientsRepository : IPatientsRepository
    {
        private readonly UsersDbContext dbContext;

        public PatientsRepository(UsersDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        public async Task<Patient> CreateAsync(Patient patient)
        {
            await dbContext.Patients.AddAsync(patient);
            await dbContext.SaveChangesAsync();
            return patient;
        }

        public async Task<Patient?> DeleteAsync(Patient patient)
        {
            dbContext.Patients.Remove(patient);
            await dbContext.SaveChangesAsync();
            return patient;
        }

        public async Task<IReadOnlyList<Patient>> GetAllAsync()
        {
            return await dbContext.Patients.AsNoTracking().ToListAsync();
        }

        public async Task<Patient?> GetByIdAsync(Guid id)
        {
            return await dbContext.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Patient?> GetByIdentityIdAsync(string identityId)
        {
            return await dbContext.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.IdentityId == identityId);
        }

        public async Task<Patient?> UpdateAsync(Patient patient)
        {
            var existingPatient = dbContext.Patients.FirstOrDefault(p => p.Id == patient.Id);
            if (existingPatient == null)
            {
                return null;
            }
            dbContext.Entry(existingPatient).CurrentValues.SetValues(patient);
            await dbContext.SaveChangesAsync();
            return existingPatient;
        }
    }
}
