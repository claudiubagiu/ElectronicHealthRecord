using Diagnostics.Api.Data;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace Diagnostics.Api.Repositories.Implementation
{
    public class AccessRequestRepository : IAccessRequestRepository
    {
        private readonly DiagnosticsDbContext _dbContext;

        public AccessRequestRepository(DiagnosticsDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<DiagnosticsAccessRequest> CreateAsync(DiagnosticsAccessRequest request)
        {
            await _dbContext.AccessRequests.AddAsync(request);
            await _dbContext.SaveChangesAsync();
            return request;
        }

        public async Task<DiagnosticsAccessRequest?> GetByIdAsync(Guid id)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<DiagnosticsAccessRequest?> GetPendingAsync(Guid doctorId, Guid patientId)
        {
            return await _dbContext.AccessRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.DoctorId == doctorId &&
                    r.PatientId == patientId &&
                    r.Status == AccessRequestStatus.Pending);
        }

        public async Task<IReadOnlyList<DiagnosticsAccessRequest>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .Where(r => r.PatientId == patientId)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<DiagnosticsAccessRequest>> GetByDoctorIdAsync(Guid doctorId)
        {
            return await _dbContext.AccessRequests
                .Include(r => r.Doctor)
                .Include(r => r.Patient)
                .AsNoTracking()
                .Where(r => r.DoctorId == doctorId)
                .ToListAsync();
        }

        public async Task<DiagnosticsAccessRequest> UpdateAsync(DiagnosticsAccessRequest request)
        {
            _dbContext.AccessRequests.Update(request);
            await _dbContext.SaveChangesAsync();
            return request;
        }

        public async Task<IReadOnlyList<DiagnosticsAccessRequest>> GetExpiredApprovedAsync()
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

        public async Task<IReadOnlyList<DiagnosticsAccessRequest>> GetApprovedByPatientIdAsync(Guid patientId)
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