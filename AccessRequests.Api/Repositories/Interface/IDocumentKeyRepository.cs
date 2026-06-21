using AccessRequests.Api.Models.Domain;

namespace AccessRequests.Api.Repositories.Interface
{
    public interface IDocumentKeyRepository
    {
        Task<DocumentKey> CreateAsync(DocumentKey documentKey);
        Task<DocumentKey?> GetByIpfsCidAsync(string ipfsCid);
        Task<IReadOnlyList<DocumentKey>> GetByPatientIdAsync(Guid patientId);
        Task<bool> ExistsAsync(string ipfsCid);
        Task<int> UpdateEncryptedKeysAsync(Guid patientId, Dictionary<string, string> ipfsCidToEncryptedDocumentKey);
    }
}