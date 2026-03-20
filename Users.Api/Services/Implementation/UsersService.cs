using AutoMapper;
using Users.Api.Models.DTOs;
using Users.Api.Repositories.Interface;
using Users.Api.Services.Interface;

namespace Users.Api.Services.Implementation
{
    public class UsersService : IUsersService
    {
        private readonly IPatientsRepository _patientsRepository;
        private readonly IDoctorsRepository _doctorsRepository;
        private readonly IMapper _mapper;

        public UsersService(
            IPatientsRepository patientsRepository,
            IDoctorsRepository doctorsRepository,
            IMapper mapper)
        {
            _patientsRepository = patientsRepository;
            _doctorsRepository = doctorsRepository;
            _mapper = mapper;
        }

        public async Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search)
        {
            var patients = await _patientsRepository.SearchByNameAsync(search);
            return _mapper.Map<IReadOnlyList<PatientDto>>(patients);
        }

        public async Task<string?> GetEncryptedPrivateKeyAsync(Guid userId, string role)
        {
            if (role == "Patient")
            {
                var patient = await _patientsRepository.GetByIdAsync(userId);
                return patient?.EncryptedPrivateKey;
            }
            else if (role == "Doctor")
            {
                var doctor = await _doctorsRepository.GetByIdAsync(userId);
                return doctor?.EncryptedPrivateKey;
            }

            return null;
        }

        public async Task<PublicKeyDto?> GetPublicKeyAsync(Guid userId)
        {
            var patient = await _patientsRepository.GetByIdAsync(userId);
            if (patient?.PublicKey != null)
            {
                return new PublicKeyDto { UserId = patient.Id, PublicKey = patient.PublicKey };
            }

            var doctor = await _doctorsRepository.GetByIdAsync(userId);
            if (doctor?.PublicKey != null)
            {
                return new PublicKeyDto { UserId = doctor.Id, PublicKey = doctor.PublicKey };
            }

            return null;
        }

        public async Task<List<PublicKeyDto>> GetPublicKeysByUserIdsAsync(List<Guid> userIds)
        {
            var result = new List<PublicKeyDto>();

            foreach (var userId in userIds)
            {
                var pk = await GetPublicKeyAsync(userId);
                if (pk != null)
                {
                    result.Add(pk);
                }
            }

            return result;
        }
    }
}