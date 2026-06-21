using AccessRequests.Api.Data;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Repositories.Interface;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Repositories.Implementation
{
    public class DocumentKeyRepository : IDocumentKeyRepository
    {
        private readonly AccessRequestDbContext _dbContext;

        public DocumentKeyRepository(AccessRequestDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<DocumentKey> CreateAsync(DocumentKey documentKey)
        {
            await _dbContext.DocumentKeys.AddAsync(documentKey);
            await _dbContext.SaveChangesAsync();
            return documentKey;
        }

        public async Task<DocumentKey?> GetByIpfsCidAsync(string ipfsCid)
        {
            return await _dbContext.DocumentKeys
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.IpfsCid == ipfsCid);
        }

        public async Task<IReadOnlyList<DocumentKey>> GetByPatientIdAsync(Guid patientId)
        {
            return await _dbContext.DocumentKeys
                .AsNoTracking()
                .Where(d => d.PatientId == patientId)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(string ipfsCid)
        {
            return await _dbContext.DocumentKeys
                .AnyAsync(d => d.IpfsCid == ipfsCid);
        }

        /// <summary>
        /// Batch re-wraps DocumentKeys under a new PatientMasterKey, used
        /// during PatientMasterKey rotation. Only EncryptedDocumentKey
        /// changes — the underlying IPFS file is never touched, keeping
        /// the operation cheap and independent of file size or count.
        /// Scoped to patientId for safety: a caller can only rotate keys
        /// for their own documents.
        /// </summary>
        public async Task<int> UpdateEncryptedKeysAsync(Guid patientId, Dictionary<string, string> ipfsCidToEncryptedDocumentKey)
        {
            var cids = ipfsCidToEncryptedDocumentKey.Keys.ToList();

            var documentKeys = await _dbContext.DocumentKeys
                .Where(d => d.PatientId == patientId && cids.Contains(d.IpfsCid))
                .ToListAsync();

            var now = DateTime.UtcNow;
            foreach (var documentKey in documentKeys)
            {
                documentKey.EncryptedDocumentKey = ipfsCidToEncryptedDocumentKey[documentKey.IpfsCid];
                documentKey.UpdatedAt = now;
            }

            await _dbContext.SaveChangesAsync();
            return documentKeys.Count;
        }
    }
}