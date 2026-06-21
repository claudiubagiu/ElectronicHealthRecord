using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.DTOs;
using AccessRequests.Api.Repositories.Interface;
using AccessRequests.Api.Services.Interface;
using FluentResults;

namespace AccessRequests.Api.Services.Implementation
{
    /// <summary>
    /// Manages DocumentKey records — the per-document AES key (DocumentKey),
    /// wrapped with the patient's PatientMasterKey, for files stored on IPFS.
    ///
    /// Authorization mirrors Envelope access: a caller may create or read a
    /// DocumentKey for a given patient if they ARE that patient, or if they
    /// hold an active Envelope for that patient (i.e. an approved
    /// AccessRequest — doctor, lab technician, pharmacist, medical assistant,
    /// etc.). There is no separate read/write distinction: anyone authorized
    /// to act on a patient's behalf can both register new DocumentKeys and
    /// read existing ones, the same way they already can with Envelopes.
    /// </summary>
    public class DocumentKeyService : IDocumentKeyService
    {
        private readonly IDocumentKeyRepository _documentKeyRepository;
        private readonly IEnvelopeRepository _envelopeRepository;
        private readonly IUsersRepository _usersRepository;

        public DocumentKeyService(
            IDocumentKeyRepository documentKeyRepository,
            IEnvelopeRepository envelopeRepository,
            IUsersRepository usersRepository)
        {
            _documentKeyRepository = documentKeyRepository;
            _envelopeRepository = envelopeRepository;
            _usersRepository = usersRepository;
        }

        public async Task<Result<DocumentKeyDto>> CreateAsync(Guid callerId, CreateDocumentKeyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IpfsCid))
                return Result.Fail<DocumentKeyDto>(
                    new Error("IpfsCid is required.").WithMetadata("StatusCode", 400));

            if (string.IsNullOrWhiteSpace(dto.EncryptedDocumentKey))
                return Result.Fail<DocumentKeyDto>(
                    new Error("EncryptedDocumentKey is required.").WithMetadata("StatusCode", 400));

            if (!await _usersRepository.ExistsAsync(dto.PatientId))
                return Result.Fail<DocumentKeyDto>(
                    new Error("Patient not found.").WithMetadata("StatusCode", 404));

            if (!await IsAuthorizedAsync(callerId, dto.PatientId))
                return Result.Fail<DocumentKeyDto>(
                    new Error("You are not authorized to register a document key for this patient.")
                        .WithMetadata("StatusCode", 403));

            if (await _documentKeyRepository.ExistsAsync(dto.IpfsCid))
                return Result.Fail<DocumentKeyDto>(
                    new Error("A document key already exists for this IPFS CID.")
                        .WithMetadata("StatusCode", 409));

            var now = DateTime.UtcNow;
            var documentKey = new DocumentKey
            {
                Id = Guid.NewGuid(),
                PatientId = dto.PatientId,
                IpfsCid = dto.IpfsCid,
                EncryptedDocumentKey = dto.EncryptedDocumentKey,
                CreatedAt = now,
                UpdatedAt = now
            };

            var created = await _documentKeyRepository.CreateAsync(documentKey);
            return Result.Ok(MapToDto(created));
        }

        public async Task<Result<DocumentKeyDto>> GetByIpfsCidAsync(Guid callerId, string ipfsCid)
        {
            var documentKey = await _documentKeyRepository.GetByIpfsCidAsync(ipfsCid);
            if (documentKey == null)
                return Result.Fail<DocumentKeyDto>(
                    new Error("No document key found for this IPFS CID.").WithMetadata("StatusCode", 404));

            if (!await IsAuthorizedAsync(callerId, documentKey.PatientId))
                return Result.Fail<DocumentKeyDto>(
                    new Error("You are not authorized to access this document key.")
                        .WithMetadata("StatusCode", 403));

            return Result.Ok(MapToDto(documentKey));
        }

        public async Task<Result<IReadOnlyList<DocumentKeyDto>>> GetByPatientIdAsync(Guid patientId, Guid callerId)
        {
            // Only the patient themselves can list every DocumentKey they
            // own — needed for PatientMasterKey rotation. Authorized users
            // (doctors, lab techs, etc.) only ever fetch a single
            // DocumentKey by IpfsCid, via GetByIpfsCidAsync above.
            if (callerId != patientId)
                return Result.Fail<IReadOnlyList<DocumentKeyDto>>(
                    new Error("Only the patient can list their full set of document keys.")
                        .WithMetadata("StatusCode", 403));

            var documentKeys = await _documentKeyRepository.GetByPatientIdAsync(patientId);
            return Result.Ok<IReadOnlyList<DocumentKeyDto>>(documentKeys.Select(MapToDto).ToList());
        }

        /// <summary>
        /// Batch re-wraps every entry's EncryptedDocumentKey for the calling
        /// patient's own documents, after the patient has generated a new
        /// PatientMasterKey client-side and re-wrapped each DocumentKey
        /// under it. The underlying IPFS file is never re-sent here.
        /// </summary>
        public async Task<Result<int>> RotateAsync(Guid patientId, RotateDocumentKeysDto dto)
        {
            if (dto.Entries == null || dto.Entries.Count == 0)
                return Result.Fail<int>(
                    new Error("At least one entry is required.").WithMetadata("StatusCode", 400));

            if (dto.Entries.Any(e => string.IsNullOrWhiteSpace(e.EncryptedDocumentKey)))
                return Result.Fail<int>(
                    new Error("EncryptedDocumentKey is required for every entry.").WithMetadata("StatusCode", 400));

            var map = dto.Entries.ToDictionary(e => e.IpfsCid, e => e.EncryptedDocumentKey);

            var updatedCount = await _documentKeyRepository.UpdateEncryptedKeysAsync(patientId, map);
            return Result.Ok(updatedCount);
        }

        /// <summary>
        /// True if the caller IS the patient, or holds an active Envelope
        /// for that patient (i.e. has approved access). Mirrors the
        /// authorization already used for GetEnvelope.
        /// </summary>
        private async Task<bool> IsAuthorizedAsync(Guid callerId, Guid patientId)
        {
            if (callerId == patientId) return true;
            return await _envelopeRepository.ExistsAsync(patientId, callerId);
        }

        private static DocumentKeyDto MapToDto(DocumentKey d) => new()
        {
            Id = d.Id,
            PatientId = d.PatientId,
            IpfsCid = d.IpfsCid,
            EncryptedDocumentKey = d.EncryptedDocumentKey,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }
}