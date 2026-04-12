using AutoMapper;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Models.Messages;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace MedicalData.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<User, UserCreatedEvent>().ReverseMap();
        }
    }
}