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

        /// <summary>
        /// Creates a new diagnostic draft. Called by MedicalAssistant or Doctor.
        /// </summary>
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

        /// <summary>
        /// Returns the active draft for a given patient, if any.
        /// </summary>
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

        /// <summary>
        /// Updates an existing draft (assistant saves progress or doctor completes it).
        /// </summary>
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

        /// <summary>
        /// Deletes a draft. Called after Sign & Submit, or manually to cancel a consultation.
        /// </summary>
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