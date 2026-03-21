namespace Ipfs.Api.Models.DTOs
{
    /// <summary>
    /// Request DTO for uploading an encrypted diagnostic payload to IPFS.
    /// 
    /// Binary fields (encrypted file content and IV) are transmitted as
    /// Base64-encoded strings to reduce JSON payload size compared to
    /// integer arrays. The AES encryption key is managed entirely by
    /// Lit Protocol and is not included in this payload.
    /// </summary>
    public class UploadEncryptedDataRequestDto
    {
        /// <summary>
        /// AES-GCM encrypted file content, encoded as a Base64 string.
        /// </summary>
        public required string EncryptedFile { get; set; }

        /// <summary>
        /// AES-GCM initialization vector (12 bytes), encoded as a Base64 string.
        /// </summary>
        public required string Iv { get; set; }

        /// <summary>
        /// Original file name preserved for display and MIME type detection
        /// (e.g. "diagnostic_mri_lumbar.pdf").
        /// </summary>
        public required string FileName { get; set; }

        /// <summary>
        /// Unix timestamp in milliseconds indicating when the payload was created.
        /// </summary>
        public required long Timestamp { get; set; }

        /// <summary>
        /// Lit Protocol metadata containing the encrypted AES key and its
        /// integrity hash. Required for decryption through Lit's network.
        /// </summary>
        public required LitMetadataDto LitMetadata { get; set; }
    }

    /// <summary>
    /// Lit Protocol encryption metadata returned after encrypting
    /// the AES key with access-controlled conditions.
    /// </summary>
    public class LitMetadataDto
    {
        /// <summary>
        /// The Lit-encrypted ciphertext containing the AES key.
        /// </summary>
        public required string Ciphertext { get; set; }

        /// <summary>
        /// Hash of the original plaintext data, used by Lit for integrity verification.
        /// </summary>
        public required string DataToEncryptHash { get; set; }
    }
}