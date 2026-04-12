using MedicalData.Api.Models.Domain;

namespace MedicalData.Api.Repositories.Interface
{
    public interface IMedicalRecordRepository
    {
        Task<MedicalRecord> CreateAsync(MedicalRecord record);
        Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(Guid patientId, Guid requestingUserId);
        Task AddEnvelopesAsync(IEnumerable<MedicalRecordEnvelope> envelopes);
        Task DeleteEnvelopesByUserAndPatientAsync(Guid userId, Guid patientId);
    }
}