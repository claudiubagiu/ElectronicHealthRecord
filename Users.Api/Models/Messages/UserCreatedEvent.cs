namespace Users.Api.Models.Messages
{
    public class UserCreatedEvent
    {
        public required string Id { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string Role { get; set; }

        /// <summary>
        /// The user's secp256k1 ECC public key — propagated so downstream
        /// services (MedicalData.Api, Diagnostics.Api, etc.) can perform
        /// ECIES envelope encryption locally, without a cross-service call.
        /// </summary>
        public required string PublicKey { get; set; }

        /// <summary>
        /// The user's personal AES data key, ECIES-encrypted with PublicKey.
        /// </summary>
        public string? EncryptedAesKey { get; set; }
    }
}