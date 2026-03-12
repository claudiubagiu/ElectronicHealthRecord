namespace Diagnostics.Api.Models.DTOs
{
    public class CreateDiagnosticRequestDto
    {
        public required Guid PatientId { get; set; }
        public required Guid DoctorId { get; set; }
        public required string Description { get; set; }
        public required IFormFile File { get; set; }
    }
}
