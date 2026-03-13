using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Services.Implementation;
using Diagnostics.Api.Services.Interface;
using FluentResults;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Diagnostics.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiagnosticsController : ControllerBase
    {
        private readonly IDiagnosticsService _diagnosticsService;

        public DiagnosticsController(IDiagnosticsService diagnosticsService)
        {
            _diagnosticsService = diagnosticsService;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddDiagnostic(
            [FromForm] CreateDiagnosticRequestDto request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest("File is required.");

            var doctorIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId").Value;
            request.DoctorId = Guid.Parse(doctorIdClaim);

            var result = await _diagnosticsService.CreateAsync(request);

            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

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

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetFile(Guid id)
        {
            var result = await _diagnosticsService.GetFileByIdAsync(id);

            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

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

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetAllByPatientId(Guid patientId)
        {
            var result = await _diagnosticsService.GetAllByPatientIdAsync(patientId);

            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteById(Guid id)
        {
            var result = await _diagnosticsService.DeleteByIdAsync(id);

            if (result.IsSuccess)
                return Ok(result.Value);

            var error = result.Errors.First();

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
