namespace Auth.Api.Models.DTOs
{
    public class RotateAesKeyRequestDto
    {
        public required string EncryptedAesKey { get; set; }
    }
}