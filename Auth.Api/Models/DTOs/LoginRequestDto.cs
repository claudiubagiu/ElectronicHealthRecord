namespace Auth.Api.Models.DTOs
{
    /// <summary>
    /// Payload sent by the frontend during login.
    /// Contains the wallet address, the ECC signature of the challenge,
    /// and the challenge itself for server-side verification.
    /// </summary>
    public class LoginRequestDto
    {
        public required string WalletAddress { get; set; }
        public required string EccSignature { get; set; }
        public required string Challenge { get; set; }
    }
}