namespace Ipfs.Api.Models.Domain
{
    public class PinataUploadResponse
    {
        public required string IpfsHash { get; set; }
        public long PinSize { get; set; }
        public required string Timestamp { get; set; }
    }
}
