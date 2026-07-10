using FluentResults;
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

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMedicalRecordDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.UpdateAsync(id, userId.Value, dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.DeleteAsync(id, userId.Value);
            if (result.IsSuccess) return NoContent();
            return BuildError(result.Errors.First());
        }

        [HttpPatch("rotate-keys")]
        [Authorize(Roles = "Patient")]
        public async Task<IActionResult> RotateDocumentKeys([FromBody] RotateDocumentKeysDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _medicalRecordService.RotateDocumentKeysAsync(userId.Value, dto);
            if (result.IsSuccess) return Ok(new { updatedCount = result.Value });
            return BuildError(result.Errors.First());
        }

        private Guid? GetUserId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            return claim != null ? Guid.Parse(claim) : null;
        }

        private IActionResult BuildError(IError error)
        {
            var statusCode = error.Metadata.TryGetValue("StatusCode", out var sc)
                ? (int)sc : 500;
            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Error",
                Detail = error.Message,
                Status = statusCode
            });
        }
    }
}