using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Users.Api.Models.DTOs;
using Users.Api.Services.Interface;

namespace Users.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService usersService;

        public UsersController(IUsersService usersService)
        {
            this.usersService = usersService;
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var patient = await usersService.GetPatientByIdentityIdAsync(identityId);
            if (patient == null) return NotFound("Patient profile not found.");

            return Ok(patient);
        }

        [HttpGet("me/doctor")]
        [Authorize]
        public async Task<IActionResult> GetMyDoctorProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var doctor = await usersService.GetDoctorByIdentityIdAsync(identityId);
            if (doctor == null) return NotFound("Doctor profile not found.");

            return Ok(doctor);
        }

        [HttpGet("me/lab-tech")]
        [Authorize]
        public async Task<IActionResult> GetMyLabTechProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var labTech = await usersService.GetLabTechByIdentityIdAsync(identityId);
            if (labTech == null) return NotFound("Laboratory technician profile not found.");

            return Ok(labTech);
        }

        [HttpGet("me/pharmacist")]
        [Authorize]
        public async Task<IActionResult> GetMyPharmacistProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var pharmacist = await usersService.GetPharmacistByIdentityIdAsync(identityId);
            if (pharmacist == null) return NotFound("Pharmacist profile not found.");

            return Ok(pharmacist);
        }

        [HttpGet("me/medical-assistant")]
        [Authorize]
        public async Task<IActionResult> GetMyMedicalAssistantProfile()
        {
            var identityId = User.Claims.FirstOrDefault(c => c.Type == "identityId")?.Value;
            if (identityId == null) return Unauthorized();

            var assistant = await usersService.GetMedicalAssistantByIdentityIdAsync(identityId);
            if (assistant == null) return NotFound("Medical assistant profile not found.");

            return Ok(assistant);
        }

        /// <summary>
        /// Returns full patient details (including CNP) by patient ID.
        /// Used by Doctors, Medical Assistants and Laboratory Technicians
        /// who already have an approved access relationship with the
        /// patient, to populate consultation/lab documents correctly
        /// (e.g. the CNP shown on the generated PDF).
        /// </summary>
        [HttpGet("patient/{patientId}")]
        [Authorize(Roles = "Doctor,MedicalAssistant,LaboratoryTechnician")]
        public async Task<IActionResult> GetPatientById(Guid patientId)
        {
            var patient = await usersService.GetPatientByIdAsync(patientId);
            if (patient == null) return NotFound("Patient not found.");

            return Ok(patient);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchPatients([FromQuery] string search)
        {
            var patients = await usersService.GetPatiensByFullName(search);
            return Ok(patients);
        }

        [HttpGet("keys/public/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetPublicKey(Guid userId)
        {
            var publicKey = await usersService.GetPublicKeyAsync(userId);
            if (publicKey == null)
                return NotFound("No public key found for this user.");
            return Ok(publicKey);
        }

        [HttpPost("keys/public/bulk")]
        [Authorize]
        public async Task<IActionResult> GetPublicKeysBulk([FromBody] List<Guid> userIds)
        {
            var keys = await usersService.GetPublicKeysByUserIdsAsync(userIds);
            return Ok(keys);
        }
    }
}