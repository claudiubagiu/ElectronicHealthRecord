using Users.Api.Models.DTOs;

namespace Users.Api.Services.Interface
{
    public interface IUsersService
    {
        Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search);
        Task<PublicKeyDto?> GetPublicKeyAsync(Guid userId);
        Task<List<PublicKeyDto>> GetPublicKeysByUserIdsAsync(List<Guid> userIds);
        Task<PatientDto?> GetPatientByIdentityIdAsync(string identityId);
        Task<DoctorDto?> GetDoctorByIdentityIdAsync(string identityId);
        Task<LaboratoryTechnicianDto?> GetLabTechByIdentityIdAsync(string identityId);
        Task<PharmacistDto?> GetPharmacistByIdentityIdAsync(string identityId);
        Task<MedicalAssistantDto?> GetMedicalAssistantByIdentityIdAsync(string identityId);
    }
}
