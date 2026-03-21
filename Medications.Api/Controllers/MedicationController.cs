using Medications.Api.Models.DTOs;
using Medications.Api.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Medications.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MedicationController : ControllerBase
    {
        private readonly IMedicationService _medicationService;

        public MedicationController(IMedicationService medicationService)
        {
            _medicationService = medicationService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMedicationDto dto)
        {
            var doctorId = GetUserId();
            if (doctorId == null) return Unauthorized();

            var result = await _medicationService.CreateAsync(doctorId.Value, dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetByPatientId(Guid patientId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicationService.GetByPatientIdAsync(patientId, userId.Value);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPost("envelopes/bulk")]
        public async Task<IActionResult> AddEnvelopesBulk([FromBody] BulkEnvelopeDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicationService.AddEnvelopesBulkAsync(userId.Value, dto);
            if (result.IsSuccess) return Ok();
            return BuildError(result.Errors.First());
        }

        [HttpDelete("envelopes/user/{doctorId}/patient/{patientId}")]
        public async Task<IActionResult> DeleteEnvelopes(Guid doctorId, Guid patientId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicationService.DeleteEnvelopesAsync(
                userId.Value, doctorId, patientId);
            if (result.IsSuccess) return NoContent();
            return BuildError(result.Errors.First());
        }

        private Guid? GetUserId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            return claim != null ? Guid.Parse(claim) : null;
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