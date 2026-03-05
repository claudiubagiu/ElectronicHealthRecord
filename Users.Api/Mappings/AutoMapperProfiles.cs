using AutoMapper;
using Users.Api.Models.Domain;
using Users.Api.Models.Messages;

namespace Users.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<IdentityCreatedEvent, Patient>().ReverseMap();
            CreateMap<IdentityCreatedEvent, Doctor>().ReverseMap();
        }
    }
}
