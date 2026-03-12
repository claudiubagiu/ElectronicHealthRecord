using Diagnostics.Api.Models.Domain;

namespace Diagnostics.Api.Repositories.Interface
{
    public interface IDiagnosticsRepository
    {
        Task<Diagnostic> CreateAsync(Diagnostic diagnostic);
        Task<Diagnostic?> GetByIdAsync(Guid id);
        Task<IReadOnlyList<Diagnostic?>> GetAllByPatientIdAsync(Guid patientId);
        Task<bool> DeleteByIdAsync(Guid id);
    }
}
