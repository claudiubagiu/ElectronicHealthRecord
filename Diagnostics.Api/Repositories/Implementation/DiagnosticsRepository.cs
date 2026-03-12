using Diagnostics.Api.Data;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;
using System.Numerics;

namespace Diagnostics.Api.Repositories.Implementation
{
    public class DiagnosticsRepository : IDiagnosticsRepository
    {
        private readonly DiagnosticsDbContext _dbContext;

        public DiagnosticsRepository(DiagnosticsDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Diagnostic> CreateAsync(Diagnostic diagnostic)
        {
            await _dbContext.Diagnostics.AddAsync(diagnostic);
            await _dbContext.SaveChangesAsync();
            return diagnostic; 
        }
        public async Task<Diagnostic?> GetByIdAsync(Guid id)
        {
            return await _dbContext.Diagnostics.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<IReadOnlyList<Diagnostic?>> GetAllByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.Diagnostics.AsNoTracking().Where(d => d.PatientId == patientId).Include(d => d.Doctor).ToListAsync();
        }

        public async Task<bool> DeleteByIdAsync(Guid id)
        {
            var diagnostic = await _dbContext.Diagnostics.FirstOrDefaultAsync(d => d.Id == id);

            if (diagnostic == null)
                return false;

            _dbContext.Diagnostics.Remove(diagnostic);
            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}
