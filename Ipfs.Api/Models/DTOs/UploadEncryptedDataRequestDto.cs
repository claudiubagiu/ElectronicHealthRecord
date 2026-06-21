namespace Ipfs.Api.Models.DTOs
{
    /// <summary>
    /// Request DTO for uploading an encrypted file payload to IPFS.
    ///
    /// Binary fields (encrypted file content and IV) are transmitted as
    /// Base64-encoded strings to reduce JSON payload size compared to
    /// integer arrays. The AES key used to encrypt this file is NOT
    /// included here — it's registered separately as a DocumentKey in
    /// AccessRequests.Api, wrapped with the patient's PatientMasterKey
    /// and indexed by the IPFS CID returned after this upload.
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
    }
}