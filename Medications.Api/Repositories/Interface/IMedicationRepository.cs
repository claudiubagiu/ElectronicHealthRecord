using Medications.Api.Models.Domain;

namespace Medications.Api.Repositories.Interface
{
    public interface IMedicationRepository
    {
        Task<Medication> CreateAsync(Medication medication);
        Task<IReadOnlyList<Medication>> GetByPatientIdAsync(Guid patientId, Guid requestingUserId);
        Task AddEnvelopesAsync(IEnumerable<MedicationEnvelope> envelopes);
        Task DeleteEnvelopesByUserAndPatientAsync(Guid userId, Guid patientId);
    }
}