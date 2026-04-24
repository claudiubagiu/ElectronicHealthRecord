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

        public async Task<MedicalRecord?> GetByIdAsync(Guid id)
        {
            return await _dbContext.MedicalRecords
                .Include(m => m.Envelopes)
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<MedicalRecord> UpdateAsync(MedicalRecord record)
        {
            var existingRecord = await _dbContext.MedicalRecords.FindAsync(record.Id);
            if (existingRecord == null)
                throw new InvalidOperationException($"MedicalRecord {record.Id} not found.");

            existingRecord.RecordType = record.RecordType;
            existingRecord.EncryptedData = record.EncryptedData;
            existingRecord.Iv = record.Iv;
            existingRecord.UpdatedAt = record.UpdatedAt;

            var oldEnvelopes = await _dbContext.MedicalRecordEnvelopes
                .Where(e => e.MedicalRecordId == record.Id)
                .ToListAsync();

            _dbContext.MedicalRecordEnvelopes.RemoveRange(oldEnvelopes);

            var newEnvelopes = record.Envelopes.Select(e => new MedicalRecordEnvelope
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                UserId = e.UserId,
                EncryptedAesKey = e.EncryptedAesKey
            }).ToList();

            await _dbContext.MedicalRecordEnvelopes.AddRangeAsync(newEnvelopes);

            await _dbContext.SaveChangesAsync();

            existingRecord.Envelopes = newEnvelopes;
            return existingRecord;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var record = await _dbContext.MedicalRecords.FindAsync(id);
            if (record == null) return false;

            _dbContext.MedicalRecords.Remove(record);
            await _dbContext.SaveChangesAsync();
            return true;
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