using AccessRequests.Api.Data;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Repositories.Implementation
{
    public class AccessRequestRepository : IAccessRequestRepository
    {
        private readonly AccessRequestDbContext _dbContext;

        public AccessRequestRepository(AccessRequestDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<AccessRequest> CreateAsync(AccessRequest request)
        {
            await _dbContext.AccessRequests.AddAsync(request);
            await _dbContext.SaveChangesAsync();
            return request;
        }

        public async Task<AccessRequest?> GetByIdAsync(Guid id)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<AccessRequest?> GetPendingAsync(Guid doctorId, Guid patientId)
        {
            return await _dbContext.AccessRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.DoctorId == doctorId &&
                    r.PatientId == patientId &&
                    r.Status == AccessRequestStatus.Pending);
        }

        public async Task<IReadOnlyList<AccessRequest>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .Where(r => r.PatientId == patientId)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<AccessRequest>> GetByDoctorIdAsync(Guid doctorId)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .Where(r => r.DoctorId == doctorId)
                .ToListAsync();
        }

        public async Task<AccessRequest> UpdateAsync(AccessRequest request)
        {
            _dbContext.AccessRequests.Update(request);
            await _dbContext.SaveChangesAsync();
            return request;
        }

        public async Task<IReadOnlyList<AccessRequest>> GetExpiredApprovedAsync()
        {
            var now = DateTime.UtcNow;
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .Where(r => r.Status == AccessRequestStatus.Approved &&
                            r.ExpiresAt != null &&
                            r.ExpiresAt <= now)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<AccessRequest>> GetApprovedByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .Where(r => r.PatientId == patientId && r.Status == AccessRequestStatus.Approved)
                .ToListAsync();
        }
    }
}
