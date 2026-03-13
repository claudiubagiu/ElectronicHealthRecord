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
            CreateMap<UserCreatedEvent, Patient>().ReverseMap();
            CreateMap<UserCreatedEvent, Doctor>().ReverseMap();
            CreateMap<Patient, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<Doctor, UserCreatedResponseEvent>().ReverseMap();
            CreateMap<Patient, PatientDto>().ReverseMap();
        }
    }
}
