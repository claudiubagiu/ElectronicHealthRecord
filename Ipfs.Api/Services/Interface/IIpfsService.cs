using FluentResults;
using Ipfs.Api.Models.DTOs;

namespace Ipfs.Api.Services.Interface
{
    /// <summary>
    /// Defines the contract for uploading and downloading encrypted
    /// diagnostic payloads to/from IPFS.
    /// </summary>
    public interface IIpfsService
    {
        /// <summary>
        /// Uploads an encrypted diagnostic payload to IPFS.
        /// </summary>
        /// <param name="request">The payload DTO containing Base64-encoded encrypted data.</param>
        /// <returns>The IPFS CID on success, or a failure result with error details.</returns>
        Task<Result<string>> UploadEncryptedDataAsync(UploadEncryptedDataRequestDto request);

        /// <summary>
        /// Downloads an encrypted diagnostic payload from IPFS by its CID.
        /// </summary>
        /// <param name="cid">The IPFS content identifier.</param>
        /// <returns>The deserialised payload DTO on success, or a failure result with error details.</returns>
        Task<Result<EncryptedDataResponseDto>> DownloadEncryptedDataAsync(string cid);
    }
}