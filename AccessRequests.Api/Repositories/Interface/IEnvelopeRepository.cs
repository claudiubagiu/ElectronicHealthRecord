using AccessRequests.Api.Models.Domain;

namespace AccessRequests.Api.Repositories.Interface
{
    public interface IEnvelopeRepository
    {
        Task<Envelope> CreateAsync(Envelope envelope);
        Task<Envelope?> GetByPatientAndUserAsync(Guid patientId, Guid userId);
        Task<IReadOnlyList<Envelope>> GetByPatientIdAsync(Guid patientId);
        Task<IReadOnlyList<Envelope>> GetByUserIdAsync(Guid userId);
        Task DeleteAsync(Envelope envelope);
        Task<bool> ExistsAsync(Guid patientId, Guid userId);
        Task<int> UpdateEncryptedKeysAsync(Guid patientId, Dictionary<Guid, string> userIdToEncryptedAesKey);
    }
}