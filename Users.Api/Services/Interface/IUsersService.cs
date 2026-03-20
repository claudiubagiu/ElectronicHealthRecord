using Users.Api.Models.DTOs;

namespace Users.Api.Services.Interface
{
    public interface IUsersService
    {
        Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search);
        Task<string?> GetEncryptedPrivateKeyAsync(Guid userId, string role);
        Task<PublicKeyDto?> GetPublicKeyAsync(Guid userId);
        Task<List<PublicKeyDto>> GetPublicKeysByUserIdsAsync(List<Guid> userIds);
    }
}
