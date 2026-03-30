using Auth.Api.Domain.Models;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;
using AutoMapper;

namespace Auth.Api.Mappings
{
    /// <summary>
    /// AutoMapper profile for mapping between DTOs, domain models, and events.
    /// The RegisterRequestDto → ApplicationUser mapping ignores the EccSignature
    /// field since it is only used for verification and not persisted directly.
    /// </summary>
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