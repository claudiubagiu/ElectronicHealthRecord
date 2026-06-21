namespace Ipfs.Api.Models.DTOs
{
    /// <summary>
    /// Response DTO returned when downloading an encrypted file payload
    /// from IPFS.
    ///
    /// Binary fields are represented as Base64-encoded strings, matching
    /// the format used during upload. The frontend decodes these back
    /// into typed byte arrays for use with the Web Crypto API. The
    /// DocumentKey needed to decrypt EncryptedFile is fetched separately
    /// from AccessRequests.Api, by this payload's IPFS CID.
    /// </summary>
    public class EncryptedDataResponseDto
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
        /// Original file name preserved from the upload payload.
        /// </summary>
        public required string FileName { get; set; }

        /// <summary>
        /// Unix timestamp in milliseconds from when the payload was created.
        /// </summary>
        public required long Timestamp { get; set; }
    }
}