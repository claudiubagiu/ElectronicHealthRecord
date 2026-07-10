namespace Auth.Api.Models.Messages
{
    public class AesKeyRotatedEvent
    {
        public required string IdentityId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}