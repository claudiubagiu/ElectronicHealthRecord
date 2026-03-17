namespace Diagnostics.Api.Models.DTOs
{
    public class CreateAccessRequestDto
    {
        public required Guid PatientId { get; set; }
    }
}
