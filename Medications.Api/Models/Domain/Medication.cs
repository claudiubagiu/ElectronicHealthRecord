namespace Medications.Api.Models.Domain
{
    public class Medication
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public required string EncryptedData { get; set; }
        public required string Iv { get; set; }
        public Guid CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public User? Patient { get; set; }
        public User? CreatedByDoctor { get; set; }
        public ICollection<MedicationEnvelope> Envelopes { get; set; } = new List<MedicationEnvelope>();
    }
}