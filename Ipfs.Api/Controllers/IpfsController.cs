using Ipfs.Api.Models.DTOs;
using Ipfs.Api.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Ipfs.Api.Controllers
{
    /// <summary>
    /// REST controller that exposes upload and download endpoints for
    /// encrypted diagnostic payloads stored on IPFS via Pinata.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class IpfsController : ControllerBase
    {
        private readonly IIpfsService _ipfsService;

        /// <summary>
        /// Initialises the controller with the IPFS service dependency.
        /// </summary>
        /// <param name="ipfsService">The service handling Pinata interactions.</param>
        public IpfsController(IIpfsService ipfsService)
        {
            _ipfsService = ipfsService;
        }

        /// <summary>
        /// Pins an encrypted diagnostic payload to IPFS and returns its CID.
        /// </summary>
        /// <param name="request">The encrypted payload with Base64-encoded binary fields.</param>
        /// <returns>200 OK with the IPFS CID, or 500 if the upload fails.</returns>
        [HttpPost("upload")]
        public async Task<IActionResult> Upload([FromBody] UploadEncryptedDataRequestDto request)
        {
            var result = await _ipfsService.UploadEncryptedDataAsync(request);

            if (result.IsSuccess)
                return Ok(new IpfsUploadResponseDto { Cid = result.Value });

            var error = result.Errors.First();
            return StatusCode(500, new ProblemDetails
            {
                Title = "IPFS Error",
                Detail = error.Message,
                Status = 500
            });
        }

        /// <summary>
        /// Downloads an encrypted diagnostic payload from IPFS by its CID.
        /// </summary>
        /// <param name="cid">The IPFS content identifier.</param>
        /// <returns>200 OK with the encrypted payload DTO, or 500 if the download fails.</returns>
        [HttpGet("download/{cid}")]
        public async Task<IActionResult> Download(string cid)
        {
            var result = await _ipfsService.DownloadEncryptedDataAsync(cid);

            if (result.IsSuccess)
                return Ok(result.Value);

            return StatusCode(500, new ProblemDetails
            {
                Title = "IPFS Error",
                Detail = result.Errors.First().Message,
                Status = 500
            });
        }
    }
}