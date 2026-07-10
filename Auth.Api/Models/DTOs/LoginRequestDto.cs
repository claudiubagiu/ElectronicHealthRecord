namespace Auth.Api.Models.DTOs
{
    public class LoginRequestDto
    {
        public required string WalletAddress { get; set; }
        public required string EccSignature { get; set; }
        public required string Challenge { get; set; }
    }
}