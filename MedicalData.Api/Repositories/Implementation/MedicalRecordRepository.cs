using MedicalData.Api.Data;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace MedicalData.Api.Repositories.Implementation
{
    public class MedicalRecordRepository : IMedicalRecordRepository
    {
        private readonly MedicalDataDbContext _dbContext;

        public MedicalRecordRepository(MedicalDataDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<MedicalRecord> CreateAsync(MedicalRecord record)
        {
            await _dbContext.MedicalRecords.AddAsync(record);
            await _dbContext.SaveChangesAsync();
            return record;
        }

        public async Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId)
        {
            return await _dbContext.MedicalRecords
                .Where(m => m.PatientId == patientId)
                .Include(m => m.Envelopes.Where(e => e.UserId == requestingUserId))
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task AddEnvelopesAsync(IEnumerable<MedicalRecordEnvelope> envelopes)
        {
            await _dbContext.MedicalRecordEnvelopes.AddRangeAsync(envelopes);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteEnvelopesByUserAndPatientAsync(Guid userId, Guid patientId)
        {
            var envelopes = await _dbContext.MedicalRecordEnvelopes
                .Where(e => e.UserId == userId &&
                            e.MedicalRecord!.PatientId == patientId)
                .ToListAsync();

            _dbContext.MedicalRecordEnvelopes.RemoveRange(envelopes);
            await _dbContext.SaveChangesAsync();
        }
    }
}