using AccessRequests.Api.Data;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Repositories.Implementation
{
    public class EnvelopeRepository : IEnvelopeRepository
    {
        private readonly AccessRequestDbContext _dbContext;

        public EnvelopeRepository(AccessRequestDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Envelope> CreateAsync(Envelope envelope)
        {
            await _dbContext.Envelopes.AddAsync(envelope);
            await _dbContext.SaveChangesAsync();
            return envelope;
        }

        public async Task<Envelope?> GetByPatientAndUserAsync(Guid patientId, Guid userId)
        {
            return await _dbContext.Envelopes
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.PatientId == patientId && e.UserId == userId);
        }

        public async Task<IReadOnlyList<Envelope>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.Envelopes
                .AsNoTracking()
                .Where(e => e.PatientId == patientId)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Envelope>> GetByUserIdAsync(Guid userId)
        {
            return await _dbContext.Envelopes
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .ToListAsync();
        }

        public async Task DeleteAsync(Envelope envelope)
        {
            _dbContext.Envelopes.Remove(envelope);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid patientId, Guid userId)
        {
            return await _dbContext.Envelopes
                .AnyAsync(e => e.PatientId == patientId && e.UserId == userId);
        }

        public async Task<int> UpdateEncryptedKeysAsync(Guid patientId, Dictionary<Guid, string> userIdToEncryptedAesKey)
        {
            var userIds = userIdToEncryptedAesKey.Keys.ToList();

            var envelopes = await _dbContext.Envelopes
                .Where(e => e.PatientId == patientId && userIds.Contains(e.UserId))
                .ToListAsync();

            foreach (var envelope in envelopes)
            {
                envelope.EncryptedAesKey = userIdToEncryptedAesKey[envelope.UserId];
            }

            await _dbContext.SaveChangesAsync();
            return envelopes.Count;
        }
    }
}