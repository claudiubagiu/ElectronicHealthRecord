namespace Diagnostics.Api.Models.DTOs
{
    public class DiagnosticDto
    {
        public required Guid Id { get; set; }
        public required Guid PatientId { get; set; }
        public required string DoctorName { get; set; }
        public required string Description { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required string FileName { get; set; }
        public required string FileUrl { get; set; }
    }
}
