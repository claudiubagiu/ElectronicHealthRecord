using Microsoft.EntityFrameworkCore;
using Users.Api.Data;
using Users.Api.Models.Domain;
using Users.Api.Repositories.Interface;

namespace Users.Api.Repositories.Implementation
{
    public class PharmacistsRepository : IPharmacistsRepository
    {
        private readonly UsersDbContext _context;

        public PharmacistsRepository(UsersDbContext context)
        {
            _context = context;
        }

        public async Task<Pharmacist> CreateAsync(Pharmacist pharmacist)
        {
            pharmacist.Id = Guid.NewGuid();
            await _context.Pharmacists.AddAsync(pharmacist);
            await _context.SaveChangesAsync();
            return pharmacist;
        }

        public async Task<Pharmacist?> GetByIdAsync(Guid id)
            => await _context.Pharmacists.FirstOrDefaultAsync(p => p.Id == id);

        public async Task<Pharmacist?> GetByIdentityIdAsync(string identityId)
            => await _context.Pharmacists.FirstOrDefaultAsync(p => p.IdentityId == identityId);

        public async Task<IReadOnlyList<Pharmacist>> GetAllAsync()
            => await _context.Pharmacists.ToListAsync();

        public async Task<Pharmacist?> UpdateAsync(Pharmacist pharmacist)
        {
            var existing = await _context.Pharmacists.FirstOrDefaultAsync(p => p.Id == pharmacist.Id);
            if (existing == null) return null;
            _context.Entry(existing).CurrentValues.SetValues(pharmacist);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<Pharmacist?> DeleteAsync(Pharmacist pharmacist)
        {
            var existing = await _context.Pharmacists.FirstOrDefaultAsync(p => p.Id == pharmacist.Id);
            if (existing == null) return null;
            _context.Pharmacists.Remove(existing);
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}