using AutoMapper;
using Medications.Api.Models.Domain;
using Medications.Api.Models.Messages;

namespace Medications.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<User, UserCreatedEvent>().ReverseMap();
        }
    }
}