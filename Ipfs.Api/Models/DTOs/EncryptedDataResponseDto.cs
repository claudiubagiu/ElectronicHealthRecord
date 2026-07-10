namespace Ipfs.Api.Models.DTOs
{
    public class EncryptedDataResponseDto
    {
        public required string EncryptedFile { get; set; }
        public required string Iv { get; set; }
        public required string FileName { get; set; }
        public required long Timestamp { get; set; }
    }
}