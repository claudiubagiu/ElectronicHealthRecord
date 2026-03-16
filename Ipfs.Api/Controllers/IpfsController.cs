using Ipfs.Api.Models.DTOs;
using Ipfs.Api.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Ipfs.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IpfsController : ControllerBase
    {
        private readonly IIpfsService _ipfsService;

        public IpfsController(IIpfsService ipfsService)
        {
            _ipfsService = ipfsService;
        }

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
