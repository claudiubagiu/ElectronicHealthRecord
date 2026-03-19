using AutoMapper;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Models.Messages;
using System.Numerics;

namespace Diagnostics.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<User, UserCreatedEvent>().ReverseMap();
        }
    }
}
