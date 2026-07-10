using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.DTOs;
using AccessRequests.Api.Models.Messages;

namespace AccessRequests.Api.Mappings
{
    public static class Mapper
    {
        public static User ToUser(UserCreatedEvent evt) => new()
        {
            Id = evt.Id,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            Role = evt.Role,
            PublicKey = evt.PublicKey,
            EncryptedAesKey = evt.EncryptedAesKey,
        };

        public static AccessRequestDto ToAccessRequestDto(AccessRequest r) => new()
        {
            Id = r.Id,
            DoctorId = r.DoctorId,
            DoctorName = r.Doctor != null ? $"{r.Doctor.FirstName} {r.Doctor.LastName}" : string.Empty,
            DoctorWalletAddress = r.Doctor?.WalletAddress ?? string.Empty,
            PatientId = r.PatientId,
            PatientName = r.Patient != null ? $"{r.Patient.FirstName} {r.Patient.LastName}" : string.Empty,
            PatientWalletAddress = r.Patient?.WalletAddress ?? string.Empty,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt,
            ApprovedAt = r.ApprovedAt,
            ExpiresAt = r.ExpiresAt
        };

        public static AccessRequestHistoryDto ToAccessRequestHistoryDto(AccessRequestHistory h) => new()
        {
            Id = h.Id,
            AccessRequestId = h.AccessRequestId,
            Action = h.Action,
            DoctorId = h.AccessRequest?.DoctorId ?? Guid.Empty,
            DoctorName = h.AccessRequest?.Doctor != null
                ? $"{h.AccessRequest.Doctor.FirstName} {h.AccessRequest.Doctor.LastName}"
                : string.Empty,
            PatientId = h.AccessRequest?.PatientId ?? Guid.Empty,
            PatientName = h.AccessRequest?.Patient != null
                ? $"{h.AccessRequest.Patient.FirstName} {h.AccessRequest.Patient.LastName}"
                : string.Empty,
            Timestamp = h.Timestamp
        };
        public static EnvelopeDto ToEnvelopeDto(Envelope e) => new()
        {
            Id = e.Id,
            PatientId = e.PatientId,
            UserId = e.UserId,
            EncryptedAesKey = e.EncryptedAesKey,
            CreatedAt = e.CreatedAt
        };
        public static DocumentKeyDto ToDocumentKeyDto(DocumentKey d) => new()
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