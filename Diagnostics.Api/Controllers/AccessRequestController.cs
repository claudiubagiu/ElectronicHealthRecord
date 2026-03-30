using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Diagnostics.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccessRequestController : ControllerBase
    {
        private readonly IAccessRequestService _accessRequestService;

        public AccessRequestController(IAccessRequestService accessRequestService)
        {
            _accessRequestService = accessRequestService;
        }

        [HttpPost]
        public async Task<IActionResult> RequestAccess([FromBody] CreateAccessRequestDto request)
        {
            var doctorIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (doctorIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.CreateAsync(Guid.Parse(doctorIdClaim), request);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetByPatientId(Guid patientId)
        {
            var result = await _accessRequestService.GetByPatientIdAsync(patientId);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("doctor")]
        public async Task<IActionResult> GetByDoctor()
        {
            var doctorIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (doctorIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.GetByDoctorIdAsync(Guid.Parse(doctorIdClaim));
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPatch("{id}/approve")]
        public async Task<IActionResult> Approve(Guid id)
        {
            var patientIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (patientIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.ApproveAsync(id, Guid.Parse(patientIdClaim));
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPatch("{id}/reject")]
        public async Task<IActionResult> Reject(Guid id)
        {
            var patientIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (patientIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.RejectAsync(id, Guid.Parse(patientIdClaim));
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPatch("{id}/revoke")]
        public async Task<IActionResult> Revoke(Guid id)
        {
            var patientIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (patientIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.RevokeAsync(id, Guid.Parse(patientIdClaim));
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("history/patient/{patientId}")]
        public async Task<IActionResult> GetHistoryByPatientId(Guid patientId)
        {
            var result = await _accessRequestService.GetHistoryByPatientIdAsync(patientId);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("history/doctor")]
        public async Task<IActionResult> GetHistoryByDoctor()
        {
            var doctorIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (doctorIdClaim == null) return Unauthorized();

            var result = await _accessRequestService.GetHistoryByDoctorIdAsync(Guid.Parse(doctorIdClaim));
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
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
