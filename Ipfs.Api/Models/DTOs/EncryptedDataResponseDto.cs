namespace Ipfs.Api.Models.DTOs
{
    public class EncryptedDataResponseDto
    {
        public required List<int> EncryptedFile { get; set; }
        public required List<int> EncryptedAesKey { get; set; }
        public required List<int> Iv { get; set; }
        public required string FileName { get; set; }
        public required long Timestamp { get; set; }
        public LitMetadataDto? LitMetadata { get; set; }
    }
}
