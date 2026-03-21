using Medications.Api.Data;
using Medications.Api.Models.Domain;
using Medications.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace Medications.Api.Repositories.Implementation
{
    public class MedicationRepository : IMedicationRepository
    {
        private readonly MedicationsDbContext _dbContext;

        public MedicationRepository(MedicationsDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Medication> CreateAsync(Medication medication)
        {
            await _dbContext.Medications.AddAsync(medication);
            await _dbContext.SaveChangesAsync();
            return medication;
        }

        public async Task<IReadOnlyList<Medication>> GetByPatientIdAsync(
            Guid patientId, Guid requestingUserId)
        {
            return await _dbContext.Medications
                .Where(m => m.PatientId == patientId)
                .Include(m => m.Envelopes.Where(e => e.UserId == requestingUserId))
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task AddEnvelopesAsync(IEnumerable<MedicationEnvelope> envelopes)
        {
            await _dbContext.MedicationEnvelopes.AddRangeAsync(envelopes);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteEnvelopesByUserAndPatientAsync(Guid userId, Guid patientId)
        {
            var envelopes = await _dbContext.MedicationEnvelopes
                .Where(e => e.UserId == userId &&
                            e.Medication!.PatientId == patientId)
                .ToListAsync();

            _dbContext.MedicationEnvelopes.RemoveRange(envelopes);
            await _dbContext.SaveChangesAsync();
        }
    }
}