namespace Ipfs.Api.Models.DTOs
{
    public class UploadEncryptedDataRequestDto
    {
        public required List<int> EncryptedFile { get; set; }
        public required List<int> EncryptedAesKey { get; set; }
        public required List<int> Iv { get; set; }
        public required string FileName { get; set; }
        public required long Timestamp { get; set; }
        public LitMetadataDto? LitMetadata { get; set; }
    }

    public class LitMetadataDto
    {
        public required string Ciphertext { get; set; }
        public required string DataToEncryptHash { get; set; }
    }
}
