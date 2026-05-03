using AutoMapper;
using Users.Api.Models.Domain;
using Users.Api.Models.DTOs;
using Users.Api.Models.Messages;

namespace Users.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<IdentityCreatedEvent, Patient>().ReverseMap();
            CreateMap<IdentityCreatedEvent, Doctor>().ReverseMap();
            CreateMap<IdentityCreatedEvent, LaboratoryTechnician>().ReverseMap();
            CreateMap<IdentityCreatedEvent, Pharmacist>().ReverseMap();
            CreateMap<IdentityCreatedEvent, MedicalAssistant>().ReverseMap();

            CreateMap<UserCreatedEvent, Patient>().ReverseMap();
            CreateMap<UserCreatedEvent, Doctor>().ReverseMap();
            CreateMap<UserCreatedEvent, LaboratoryTechnician>().ReverseMap();
            CreateMap<UserCreatedEvent, Pharmacist>().ReverseMap();
            CreateMap<UserCreatedEvent, MedicalAssistant>().ReverseMap();

            CreateMap<Patient, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<Doctor, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<LaboratoryTechnician, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<Pharmacist, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<MedicalAssistant, UserCreatedResponseEvent>().ReverseMap();

            CreateMap<Patient, PatientDto>().ReverseMap();
            CreateMap<Doctor, DoctorDto>().ReverseMap();
            CreateMap<LaboratoryTechnician, LaboratoryTechnicianDto>().ReverseMap();
            CreateMap<Pharmacist, PharmacistDto>().ReverseMap();
            CreateMap<MedicalAssistant, MedicalAssistantDto>().ReverseMap();
        }
    }
}