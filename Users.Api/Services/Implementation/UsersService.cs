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
        private readonly IMedicalAssistantsRepository _medicalAssistantsRepository;
        private readonly ILaboratoryTechniciansRepository _labTechRepository;
        private readonly IPharmacistsRepository _pharmacistsRepository;
        private readonly IMapper _mapper;

        public UsersService(
            IPatientsRepository patientsRepository,
            IDoctorsRepository doctorsRepository,
            IMedicalAssistantsRepository medicalAssistantsRepository,
            ILaboratoryTechniciansRepository labTechRepository,
            IPharmacistsRepository pharmacistsRepository,
            IMapper mapper)
        {
            _patientsRepository = patientsRepository;
            _doctorsRepository = doctorsRepository;
            _medicalAssistantsRepository = medicalAssistantsRepository;
            _labTechRepository = labTechRepository;
            _pharmacistsRepository = pharmacistsRepository;
            _mapper = mapper;
        }

        public async Task<IReadOnlyList<PatientDto>> GetPatiensByFullName(string search)
        {
            var patients = await _patientsRepository.SearchByNameAsync(search);
            return _mapper.Map<IReadOnlyList<PatientDto>>(patients);
        }

        public async Task<PublicKeyDto?> GetPublicKeyAsync(Guid userId)
        {
            var patient = await _patientsRepository.GetByIdAsync(userId);
            if (patient?.PublicKey != null)
                return new PublicKeyDto { UserId = patient.Id, PublicKey = patient.PublicKey };

            var doctor = await _doctorsRepository.GetByIdAsync(userId);
            if (doctor?.PublicKey != null)
                return new PublicKeyDto { UserId = doctor.Id, PublicKey = doctor.PublicKey };

            var assistant = await _medicalAssistantsRepository.GetByIdAsync(userId);
            if (assistant?.PublicKey != null)
                return new PublicKeyDto { UserId = assistant.Id, PublicKey = assistant.PublicKey };

            return null;
        }

        public async Task<List<PublicKeyDto>> GetPublicKeysByUserIdsAsync(List<Guid> userIds)
        {
            var result = new List<PublicKeyDto>();
            foreach (var userId in userIds)
            {
                var pk = await GetPublicKeyAsync(userId);
                if (pk != null)
                    result.Add(pk);
            }
            return result;
        }

        public async Task<PatientDto?> GetPatientByIdentityIdAsync(string identityId)
        {
            var patient = await _patientsRepository.GetByIdentityIdAsync(identityId);
            if (patient == null) return null;
            return _mapper.Map<PatientDto>(patient);
        }

        public async Task<DoctorDto?> GetDoctorByIdentityIdAsync(string identityId)
        {
            var doctor = await _doctorsRepository.GetByIdentityIdAsync(identityId);
            if (doctor == null) return null;
            return _mapper.Map<DoctorDto>(doctor);
        }

        public async Task<LaboratoryTechnicianDto?> GetLabTechByIdentityIdAsync(string identityId)
        {
            var labTech = await _labTechRepository.GetByIdentityIdAsync(identityId);
            if (labTech == null) return null;
            return _mapper.Map<LaboratoryTechnicianDto>(labTech);
        }

        public async Task<PharmacistDto?> GetPharmacistByIdentityIdAsync(string identityId)
        {
            var pharmacist = await _pharmacistsRepository.GetByIdentityIdAsync(identityId);
            if (pharmacist == null) return null;
            return _mapper.Map<PharmacistDto>(pharmacist);
        }

        public async Task<MedicalAssistantDto?> GetMedicalAssistantByIdentityIdAsync(string identityId)
        {
            var assistant = await _medicalAssistantsRepository.GetByIdentityIdAsync(identityId);
            if (assistant == null) return null;
            return _mapper.Map<MedicalAssistantDto>(assistant);
        }
    }
}