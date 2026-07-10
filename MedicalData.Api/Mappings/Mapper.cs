using MedicalData.Api.Models.Domain;
using MedicalData.Api.Models.DTOs;
using MedicalData.Api.Models.Messages;

namespace MedicalData.Api.Mappings
{
    public static class Mapper
    {
        public static User ToUser(UserCreatedEvent evt) => new()
        {
            Id = evt.Id,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            Role = evt.Role,
            PublicKey = evt.PublicKey,
            EncryptedAesKey = evt.EncryptedAesKey,
        };

        public static MedicalRecordDto ToMedicalRecordDto(MedicalRecord record) => new()
        {
            Id = record.Id,
            PatientId = record.PatientId,
            RecordType = record.RecordType,
            EncryptedData = record.EncryptedData,
            Iv = record.Iv,
            EncryptedDocumentKey = record.EncryptedDocumentKey,
            CreatedByDoctorId = record.CreatedByDoctorId,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt
        };
    }
}