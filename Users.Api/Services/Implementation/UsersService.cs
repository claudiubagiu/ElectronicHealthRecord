using AutoMapper;
using Users.Api.Models.DTOs;
using Users.Api.Repositories.Implementation;
using Users.Api.Repositories.Interface;
using Users.Api.Services.Interface;

namespace Users.Api.Services.Implementation
{
    public class UsersService : IUsersService
    {
        private readonly IPatientsRepository _patientsRepository;
        private readonly IMapper _mapper;
        public UsersService(IPatientsRepository patientsRepository, IMapper mapper)
        {
            _patientsRepository = patientsRepository;
            _mapper = mapper;
        }

        public async Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search)
        {
            var patients = await _patientsRepository.SearchByNameAsync(search);

            return _mapper.Map<IReadOnlyList<PatientDto>>(patients);
        } 
    }
}
