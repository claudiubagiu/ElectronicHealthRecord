using Auth.Api.Domain.Models;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;
using AutoMapper;

namespace Auth.Api.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<RegisterRequestDto, ApplicationUser>().ReverseMap();
            CreateMap<ApplicationUser, LoginResponseDto>().ReverseMap();
            CreateMap<User, UserCreatedResponseEvent>().ReverseMap();
        }
    }
}
