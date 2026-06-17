using AccessRequests.Api.Data;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Repositories.Implementation
{
    public class AccessRequestHistoryRepository : IAccessRequestHistoryRepository
    {
        private readonly AccessRequestDbContext _dbContext;

        public AccessRequestHistoryRepository(AccessRequestDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<AccessRequestHistory> CreateAsync(AccessRequestHistory history)
        {
            await _dbContext.AccessRequestHistories.AddAsync(history);
            await _dbContext.SaveChangesAsync();
            return history;
        }

        public async Task<IReadOnlyList<AccessRequestHistory>> GetByAccessRequestIdAsync(Guid accessRequestId)
        {
            return await _dbContext.AccessRequestHistories
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Doctor)
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Patient)
                .AsNoTracking()
                .Where(h => h.AccessRequestId == accessRequestId)
                .OrderByDescending(h => h.Timestamp)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<AccessRequestHistory>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.AccessRequestHistories
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Doctor)
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Patient)
                .AsNoTracking()
                .Where(h => h.AccessRequest!.PatientId == patientId)
                .OrderByDescending(h => h.Timestamp)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<AccessRequestHistory>> GetByDoctorIdAsync(Guid doctorId)
        {
            return await _dbContext.AccessRequestHistories
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Doctor)
                .Include(h => h.AccessRequest!)
                    .ThenInclude(r => r.Patient)
                .AsNoTracking()
                .Where(h => h.AccessRequest!.DoctorId == doctorId)
                .OrderByDescending(h => h.Timestamp)
                .ToListAsync();
        }
    }
}
