using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.Messages;
using AutoMapper;

namespace AccessRequests.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<User, UserCreatedEvent>().ReverseMap();
        }
    }
}
