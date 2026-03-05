namespace Auth.Api.Models.DTOs
{
    public class LoginRequestDto
    {
        public required string WalletAddress { get; set; }
        public required string Signature { get; set; }
        public required string Nonce { get; set; }
    }
}
