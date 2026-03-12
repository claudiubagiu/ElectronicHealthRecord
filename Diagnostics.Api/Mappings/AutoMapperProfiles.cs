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
            CreateMap<Diagnostic, DiagnosticDto>().ReverseMap();
            CreateMap<Diagnostic, CreateDiagnosticRequestDto>().ReverseMap();
            CreateMap<User, UserCreatedEvent>().ReverseMap();

            CreateMap<Diagnostic, DiagnosticDto>()
                .ForMember(dest => dest.DoctorName, opt => opt.MapFrom(src => $"{src.Doctor.FirstName} {src.Doctor.LastName}"))
                .ForMember(dest => dest.FileUrl, opt => opt.MapFrom(src => $"/api/diagnostics/{src.Id}/file"));

        }
    }
}
