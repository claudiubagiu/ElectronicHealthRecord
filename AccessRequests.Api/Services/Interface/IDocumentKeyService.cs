using AccessRequests.Api.Models.DTOs;
using FluentResults;

namespace AccessRequests.Api.Services.Interface
{
    public interface IDocumentKeyService
    {
        Task<Result<DocumentKeyDto>> CreateAsync(Guid callerId, CreateDocumentKeyDto dto);
        Task<Result<DocumentKeyDto>> GetByIpfsCidAsync(Guid callerId, string ipfsCid);
        Task<Result<IReadOnlyList<DocumentKeyDto>>> GetByPatientIdAsync(Guid patientId, Guid callerId);
        Task<Result<int>> RotateAsync(Guid patientId, RotateDocumentKeysDto dto);
    }
}