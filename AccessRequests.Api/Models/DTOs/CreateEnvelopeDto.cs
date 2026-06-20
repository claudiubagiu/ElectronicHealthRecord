namespace AccessRequests.Api.Models.DTOs
{
    /// <summary>
    /// Sent by the patient's frontend together with (or right after) an approve
    /// call. Contains the patient's AES data key, ECIES-encrypted client-side
    /// with the doctor's public key. The backend never sees the plaintext key.
    /// </summary>
    public class CreateEnvelopeDto
    {
        public required string EncryptedAesKey { get; set; }
    }
}