namespace Auth.Api.Models.DTOs
{
    /// <summary>
    /// Sent by the patient's frontend after generating a new PatientMasterKey
    /// client-side and re-wrapping every DocumentKey and access envelope
    /// under it. By the time this request lands, the new key is already
    /// usable everywhere else — this call makes it the system of record.
    ///
    /// The server never sees the plaintext key: EncryptedAesKey is the new
    /// AES-256 key, ECIES-encrypted with the caller's own EccPublicKey.
    /// </summary>
    public class RotateAesKeyRequestDto
    {
        public required string EncryptedAesKey { get; set; }
    }
}