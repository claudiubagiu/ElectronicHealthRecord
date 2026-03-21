namespace Ipfs.Api.Models.DTOs
{
    /// <summary>
    /// Response DTO returned after a successful IPFS upload,
    /// containing the content identifier of the pinned payload.
    /// </summary>
    public class IpfsUploadResponseDto
    {
        /// <summary>
        /// The IPFS content identifier (CID) of the pinned file.
        /// </summary>
        public required string Cid { get; set; }
    }
}