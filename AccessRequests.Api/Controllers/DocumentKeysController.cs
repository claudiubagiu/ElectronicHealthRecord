using AccessRequests.Api.Models.DTOs;
using AccessRequests.Api.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AccessRequests.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DocumentKeysController : ControllerBase
    {
        private readonly IDocumentKeyService _documentKeyService;

        public DocumentKeysController(IDocumentKeyService documentKeyService)
        {
            _documentKeyService = documentKeyService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDocumentKeyDto dto)
        {
            var callerId = GetUserId();
            if (callerId == null) return Unauthorized();

            var result = await _documentKeyService.CreateAsync(callerId.Value, dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        /// <summary>
        /// Fetches the DocumentKey for a single IPFS CID. The caller must be
        /// the patient, or hold an active Envelope for the patient.
        /// </summary>
        [HttpGet("{ipfsCid}")]
        public async Task<IActionResult> GetByIpfsCid(string ipfsCid)
        {
            var callerId = GetUserId();
            if (callerId == null) return Unauthorized();

            var result = await _documentKeyService.GetByIpfsCidAsync(callerId.Value, ipfsCid);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetByPatientId(Guid patientId)
        {
            var callerId = GetUserId();
            if (callerId == null) return Unauthorized();

            var result = await _documentKeyService.GetByPatientIdAsync(patientId, callerId.Value);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPatch("rotate")]
        public async Task<IActionResult> Rotate([FromBody] RotateDocumentKeysDto dto)
        {
            var patientIdClaim = GetUserId();
            if (patientIdClaim == null) return Unauthorized();

            var result = await _documentKeyService.RotateAsync(patientIdClaim.Value, dto);
            if (result.IsSuccess) return Ok(new { updatedCount = result.Value });
            return BuildError(result.Errors.First());
        }

        private Guid? GetUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
        }

        private ObjectResult BuildError(FluentResults.IError error)
        {
            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? (int)error.Metadata["StatusCode"]
                : StatusCodes.Status400BadRequest;

            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Error",
                Detail = error.Message,
                Status = statusCode,
                Instance = HttpContext.Request.Path
            });
        }
    }
}