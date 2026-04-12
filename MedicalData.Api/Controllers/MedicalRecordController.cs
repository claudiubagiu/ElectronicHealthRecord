using MedicalData.Api.Models.DTOs;
using MedicalData.Api.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedicalData.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MedicalRecordController : ControllerBase
    {
        private readonly IMedicalRecordService _medicalRecordService;

        public MedicalRecordController(IMedicalRecordService medicalRecordService)
        {
            _medicalRecordService = medicalRecordService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMedicalRecordDto dto)
        {
            var doctorId = GetUserId();
            if (doctorId == null) return Unauthorized();

            var result = await _medicalRecordService.CreateAsync(doctorId.Value, dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetByPatientId(Guid patientId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.GetByPatientIdAsync(patientId, userId.Value);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpPost("envelopes/bulk")]
        public async Task<IActionResult> AddEnvelopesBulk([FromBody] BulkEnvelopeDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.AddEnvelopesBulkAsync(userId.Value, dto);
            if (result.IsSuccess) return Ok();
            return BuildError(result.Errors.First());
        }

        [HttpDelete("envelopes/user/{doctorId}/patient/{patientId}")]
        public async Task<IActionResult> DeleteEnvelopes(Guid doctorId, Guid patientId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.DeleteEnvelopesAsync(
                userId.Value, doctorId, patientId);
            if (result.IsSuccess) return NoContent();
            return BuildError(result.Errors.First());
        }

        [AllowAnonymous]
        [HttpDelete("envelopes/internal/user/{doctorId}/patient/{patientId}")]
        public async Task<IActionResult> DeleteEnvelopesInternal(Guid doctorId, Guid patientId)
        {
            await _medicalRecordService.DeleteEnvelopesInternalAsync(doctorId, patientId);
            return NoContent();
        }

        private Guid? GetUserId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            return claim != null ? Guid.Parse(claim) : null;
        }

        private ObjectResult BuildError(FluentResults.IError error)
        {
            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? Convert.ToInt32(error.Metadata["StatusCode"])
                : 500;
            return StatusCode(statusCode, new { error = error.Message });
        }
    }
}