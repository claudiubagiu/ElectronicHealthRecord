using FluentResults;
using Ipfs.Api.Models.DTOs;

namespace Ipfs.Api.Services.Interface
{
    public interface IIpfsService
    {
        Task<Result<string>> UploadEncryptedDataAsync(UploadEncryptedDataRequestDto request);
        Task<Result<EncryptedDataResponseDto>> DownloadEncryptedDataAsync(string cid);
    }
}
