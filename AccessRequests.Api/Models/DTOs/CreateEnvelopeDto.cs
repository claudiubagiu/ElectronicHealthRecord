namespace AccessRequests.Api.Models.DTOs
{
    public class CreateEnvelopeDto
    {
        public required string EncryptedAesKey { get; set; }
    }
}