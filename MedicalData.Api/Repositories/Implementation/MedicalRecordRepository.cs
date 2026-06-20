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

        public async Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.MedicalRecords
                .Where(m => m.PatientId == patientId)
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<MedicalRecord?> GetByIdAsync(Guid id)
        {
            return await _dbContext.MedicalRecords
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

            await _dbContext.SaveChangesAsync();

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
    }
}