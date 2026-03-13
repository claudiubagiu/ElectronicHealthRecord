using Users.Api.Models.DTOs;

namespace Users.Api.Services.Interface
{
    public interface IUsersService
    {
        Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search);
    }
}
