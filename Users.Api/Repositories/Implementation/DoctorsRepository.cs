using Microsoft.EntityFrameworkCore;
using Users.Api.Data;
using Users.Api.Models.Domain;
using Users.Api.Repositories.Interface;

namespace Users.Api.Repositories.Implementation
{
    public class DoctorsRepository : IDoctorsRepository
    {
        private readonly UsersDbContext dbContext;

        public DoctorsRepository(UsersDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<Doctor> CreateAsync(Doctor doctor)
        {
            await dbContext.Doctors.AddAsync(doctor);
            await dbContext.SaveChangesAsync();
            return doctor;
        }

        public async Task<Doctor?> DeleteAsync(Doctor doctor)
        {
            dbContext.Doctors.Remove(doctor);
            await dbContext.SaveChangesAsync();
            return doctor;
        }

        public async Task<IReadOnlyList<Doctor>> GetAllAsync()
        {
            return await dbContext.Doctors.AsNoTracking().ToListAsync();
        }

        public async Task<Doctor?> GetByIdAsync(Guid id)
        {
            return await dbContext.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<Doctor?> GetByIdentityIdAsync(string identityId)
        {
            return await dbContext.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.IdentityId == identityId);
        }

        public async Task<Doctor?> UpdateAsync(Doctor doctor)
        {
            var existingDoctor = dbContext.Doctors.FirstOrDefault(d => d.Id == doctor.Id);
            if (existingDoctor == null)
            {
                return null;
            }
            dbContext.Entry(existingDoctor).CurrentValues.SetValues(doctor);
            await dbContext.SaveChangesAsync();
            return existingDoctor;
        }
    }
}
