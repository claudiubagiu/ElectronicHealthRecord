namespace MedicalData.Api.Models.Domain
{
    public class MedicalRecordEnvelope
    {
        public Guid Id { get; set; }
        public Guid MedicalRecordId { get; set; }
        public Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }

        public MedicalRecord? MedicalRecord { get; set; }
    }
}