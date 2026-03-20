namespace Users.Api.Models.DTOs
{
    public class PublicKeyDto
    {
        public required Guid UserId { get; set; }
        public required string PublicKey { get; set; }
    }
}
