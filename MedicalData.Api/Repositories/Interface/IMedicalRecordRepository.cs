using MedicalData.Api.Models.Domain;

namespace MedicalData.Api.Repositories.Interface
{
    public interface IMedicalRecordRepository
    {
        Task<MedicalRecord> CreateAsync(MedicalRecord record);
        Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(Guid patientId, Guid requestingUserId);
        Task<MedicalRecord?> GetByIdAsync(Guid id);
        Task<MedicalRecord> UpdateAsync(MedicalRecord record);
        Task<bool> DeleteAsync(Guid id);
        Task AddEnvelopesAsync(IEnumerable<MedicalRecordEnvelope> envelopes);
        Task DeleteEnvelopesByUserAndPatientAsync(Guid userId, Guid patientId);
    }
}