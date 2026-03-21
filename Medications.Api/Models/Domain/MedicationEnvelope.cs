namespace Medications.Api.Models.Domain
{
    public class MedicationEnvelope
    {
        public Guid Id { get; set; }
        public Guid MedicationId { get; set; }
        public Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }

        public Medication? Medication { get; set; }
    }
}