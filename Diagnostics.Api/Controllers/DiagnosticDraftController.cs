using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Diagnostics.Api.Controllers
{
    [Route("api/diagnostic-drafts")]
    [ApiController]
    [Authorize]
    public class DiagnosticDraftController : ControllerBase
    {
        private readonly IDiagnosticDraftService _draftService;

        public DiagnosticDraftController(IDiagnosticDraftService draftService)
        {
            _draftService = draftService;
        }

        [HttpPost]
        [Authorize(Roles = "MedicalAssistant,Doctor")]
        public async Task<IActionResult> Create([FromBody] CreateDiagnosticDraftDto dto)
        {
            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (callerIdClaim == null) return Unauthorized();

            var result = await _draftService.CreateAsync(Guid.Parse(callerIdClaim), dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpGet("patient/{patientId:guid}")]
        [Authorize(Roles = "MedicalAssistant,Doctor,Patient")]
        public async Task<IActionResult> GetActiveByPatient(Guid patientId)
        {
            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (callerIdClaim == null) return Unauthorized();

            var result = await _draftService.GetActiveByPatientIdAsync(patientId, Guid.Parse(callerIdClaim));
            if (result.IsSuccess) return Ok(result.Value);

            var statusCode = result.Errors.First().Metadata.TryGetValue("StatusCode", out var sc) ? (int)sc : 500;
            if (statusCode == 404) return Ok((object?)null);

            return BuildError(result.Errors.First());
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "MedicalAssistant,Doctor")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDiagnosticDraftDto dto)
        {
            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (callerIdClaim == null) return Unauthorized();

            var result = await _draftService.UpdateAsync(id, Guid.Parse(callerIdClaim), dto);
            if (result.IsSuccess) return Ok(result.Value);
            return BuildError(result.Errors.First());
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "MedicalAssistant,Doctor")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (callerIdClaim == null) return Unauthorized();

            var result = await _draftService.DeleteAsync(id, Guid.Parse(callerIdClaim));
            if (result.IsSuccess) return NoContent();
            return BuildError(result.Errors.First());
        }

        [HttpPatch("rotate-keys")]
        [Authorize(Roles = "Patient")]
        public async Task<IActionResult> RotateDocumentKeys([FromBody] RotateDocumentKeysDto dto)
        {
            var callerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (callerIdClaim == null) return Unauthorized();

            var result = await _draftService.RotateDocumentKeysAsync(Guid.Parse(callerIdClaim), dto);
            if (result.IsSuccess) return Ok(new { updatedCount = result.Value });
            return BuildError(result.Errors.First());
        }

        private IActionResult BuildError(FluentResults.IError error)
        {
            var statusCode = error.Metadata.ContainsKey("StatusCode")
                ? (int)error.Metadata["StatusCode"]
                : 400;

            return StatusCode(statusCode, new ProblemDetails
            {
                Title = "Operation failed",
                Detail = error.Message,
                Status = statusCode,
                Instance = HttpContext.Request.Path
            });
        }
    }
}