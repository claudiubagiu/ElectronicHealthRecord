namespace AccessRequests.Api.Models.DTOs
{
    public class CreateAccessRequestDto
    {
        public required Guid PatientId { get; set; }
    }
}
