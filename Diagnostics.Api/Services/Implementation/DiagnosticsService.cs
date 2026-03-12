using AutoMapper;
using Azure.Core;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Repositories.Implementation;
using Diagnostics.Api.Repositories.Interface;
using Diagnostics.Api.Services.Interface;
using FluentResults;

namespace Diagnostics.Api.Services.Implementation
{
    public class DiagnosticsService : IDiagnosticsService
    {
        private readonly IDiagnosticsRepository _diagnosticsRepository;
        private readonly string _uploadsPath;
        private readonly IMapper _mapper;
        private readonly IUsersRepository _usersRepository;
        public DiagnosticsService(IDiagnosticsRepository diagnosticsRepository, IUsersRepository usersRepository, IMapper mapper)
        {
            _diagnosticsRepository = diagnosticsRepository;
            _uploadsPath = "/app/uploads";
            _mapper = mapper;
            _usersRepository = usersRepository;
        }

        public async Task<Result<DiagnosticDto>> CreateAsync(CreateDiagnosticRequestDto request)
        {
            if(!await _usersRepository.ExistsAsync(request.PatientId))
                return Result.Fail<DiagnosticDto>(
                        new Error("Patient not found.").WithMetadata("StatusCode", 404));
            if(!await _usersRepository.ExistsAsync(request.DoctorId))
                return Result.Fail<DiagnosticDto>(
                        new Error("Doctor not found.").WithMetadata("StatusCode", 404));
            var fileId = Guid.NewGuid();
            var extension = Path.GetExtension(request.File.FileName);
            var uniqueFileName = $"{fileId}{extension}";
            var filePath = Path.Combine(_uploadsPath, uniqueFileName);

            Directory.CreateDirectory(_uploadsPath);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }

            var diagnostic = _mapper.Map<Diagnostic>(request);
            diagnostic.CreatedAt = DateTime.UtcNow;
            diagnostic.FilePath = filePath;
            diagnostic.FileName = request.File.FileName;


            diagnostic =  await _diagnosticsRepository.CreateAsync(diagnostic);

            var response = _mapper.Map<DiagnosticDto>(diagnostic);
            response.FileUrl = $"/api/diagnostics/{diagnostic.Id}/file";

            return Result.Ok(response);
        }

        public async Task<Result<IReadOnlyList<DiagnosticDto>>> GetAllByPatientIdAsync(Guid patientId)
        {
            if (!await _usersRepository.ExistsAsync(patientId))
                return Result.Fail<IReadOnlyList<DiagnosticDto>>(
                        new Error("Patient not found.").WithMetadata("StatusCode", 404));

            var diagnostics = await _diagnosticsRepository.GetAllByPatientIdAsync(patientId);

            var result = _mapper.Map<IReadOnlyList<DiagnosticDto>>(diagnostics);

            return Result.Ok<IReadOnlyList<DiagnosticDto>>(result);
        }

        public async Task<Result<bool>> DeleteByIdAsync(Guid id)
        {
            var diagnostic = await _diagnosticsRepository.GetByIdAsync(id);

            if (diagnostic == null)
                return Result.Fail<bool>(new Error("Diagnostic not found.").WithMetadata("StatusCode", 404));

            if (File.Exists(diagnostic.FilePath))
                File.Delete(diagnostic.FilePath);

            await _diagnosticsRepository.DeleteByIdAsync(id);

            return Result.Ok(true);
        }

        public async Task<Result<FileDto>> GetFileByIdAsync(Guid id)
        {
            var diagnostic = await _diagnosticsRepository.GetByIdAsync(id);

            if (diagnostic == null || !File.Exists(diagnostic.FilePath))
                return Result.Fail<FileDto>(new Error("Diagnostic not found.").WithMetadata("StatusCode", 404));

            var extension = Path.GetExtension(diagnostic.FileName).ToLowerInvariant();

            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".dcm" => "application/dicom",
                _ => "application/octet-stream"
            };

            var stream = new FileStream(diagnostic.FilePath, FileMode.Open, FileAccess.Read);

            return Result.Ok(new FileDto
            {
                Stream = stream,
                ContentType = contentType,
                FileName = diagnostic.FileName
            });
        }
    }
}
