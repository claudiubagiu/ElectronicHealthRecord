namespace Diagnostics.Api.Models.Domain
{
    public class Diagnostic
    {
        public required Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required Guid DoctorId { get; set; }
        public User? Patient { get; set; }
        public User? Doctor { get; set; }
        public required string Description { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required string FileName { get; set; }
        public required string FilePath { get; set; }
    }
}
