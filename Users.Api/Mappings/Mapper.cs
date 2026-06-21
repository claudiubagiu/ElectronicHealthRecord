using Users.Api.Models.Domain;
using Users.Api.Models.DTOs;
using Users.Api.Models.Messages;

namespace Users.Api.Mappings
{
    /// <summary>
    /// Manual replacement for the old AutoMapper-based AutoMapperProfiles.
    /// Maps between events, domain models, and DTOs for Users.Api.
    /// </summary>
    public static class Mapper
    {
        // ───────────────────────── IdentityCreatedEvent → domain ─────────────────────────

        public static Patient ToPatient(IdentityCreatedEvent evt) => new()
        {
            Id = Guid.NewGuid(),
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            CNP = evt.CNP!,
            DateOfBirth = evt.DateOfBirth!.Value,
            PublicKey = evt.PublicKey,
            EncryptedAesKey = evt.EncryptedAesKey!,
        };

        public static Doctor ToDoctor(IdentityCreatedEvent evt) => new()
        {
            Id = Guid.NewGuid(),
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            Specialization = evt.Specialization!,
            LicenseNumber = evt.LicenseNumber!,
            EntityAffiliation = evt.EntityAffiliation!,
            PublicKey = evt.PublicKey,
        };

        public static LaboratoryTechnician ToLaboratoryTechnician(IdentityCreatedEvent evt) => new()
        {
            Id = Guid.NewGuid(),
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            Specialization = evt.Specialization!,
            EntityAffiliation = evt.EntityAffiliation!,
            PublicKey = evt.PublicKey,
        };

        public static Pharmacist ToPharmacist(IdentityCreatedEvent evt) => new()
        {
            Id = Guid.NewGuid(),
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            LicenseNumber = evt.LicenseNumber!,
            EntityAffiliation = evt.EntityAffiliation!,
            PublicKey = evt.PublicKey,
        };

        public static MedicalAssistant ToMedicalAssistant(IdentityCreatedEvent evt) => new()
        {
            Id = Guid.NewGuid(),
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
            WalletAddress = evt.WalletAddress,
            EntityAffiliation = evt.EntityAffiliation!,
            PublicKey = evt.PublicKey,
        };

        // ───────────────────────── domain → UserCreatedResponseEvent ─────────────────────────
        // Id on UserCreatedResponseEvent is a string; domain Id is a Guid.

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(Patient p) => new()
        {
            Id = p.Id.ToString(),
            IdentityId = p.IdentityId,
            FirstName = p.FirstName,
            LastName = p.LastName,
        };

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(Doctor d) => new()
        {
            Id = d.Id.ToString(),
            IdentityId = d.IdentityId,
            FirstName = d.FirstName,
            LastName = d.LastName,
        };

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(LaboratoryTechnician l) => new()
        {
            Id = l.Id.ToString(),
            IdentityId = l.IdentityId,
            FirstName = l.FirstName,
            LastName = l.LastName,
        };

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(Pharmacist ph) => new()
        {
            Id = ph.Id.ToString(),
            IdentityId = ph.IdentityId,
            FirstName = ph.FirstName,
            LastName = ph.LastName,
        };

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(MedicalAssistant m) => new()
        {
            Id = m.Id.ToString(),
            IdentityId = m.IdentityId,
            FirstName = m.FirstName,
            LastName = m.LastName,
        };

        // ───────────────────────── domain → UserCreatedEvent ─────────────────────────
        // Id on UserCreatedEvent (Users.Api.Models.Messages) is a string;
        // Role is set by the caller right after, same as with the old AutoMapper profile.

        public static UserCreatedEvent ToUserCreatedEvent(Patient p) => new()
        {
            Id = p.Id.ToString(),
            FirstName = p.FirstName,
            LastName = p.LastName,
            WalletAddress = p.WalletAddress,
            Role = string.Empty,
            PublicKey = p.PublicKey,
            EncryptedAesKey = p.EncryptedAesKey,
        };

        public static UserCreatedEvent ToUserCreatedEvent(Doctor d) => new()
        {
            Id = d.Id.ToString(),
            FirstName = d.FirstName,
            LastName = d.LastName,
            WalletAddress = d.WalletAddress,
            Role = string.Empty,
            PublicKey = d.PublicKey,
            EncryptedAesKey = null,
        };

        public static UserCreatedEvent ToUserCreatedEvent(LaboratoryTechnician l) => new()
        {
            Id = l.Id.ToString(),
            FirstName = l.FirstName,
            LastName = l.LastName,
            WalletAddress = l.WalletAddress,
            Role = string.Empty,
            PublicKey = l.PublicKey,
            EncryptedAesKey = null,
        };

        public static UserCreatedEvent ToUserCreatedEvent(Pharmacist ph) => new()
        {
            Id = ph.Id.ToString(),
            FirstName = ph.FirstName,
            LastName = ph.LastName,
            WalletAddress = ph.WalletAddress,
            Role = string.Empty,
            PublicKey = ph.PublicKey,
            EncryptedAesKey = null,
        };

        public static UserCreatedEvent ToUserCreatedEvent(MedicalAssistant m) => new()
        {
            Id = m.Id.ToString(),
            FirstName = m.FirstName,
            LastName = m.LastName,
            WalletAddress = m.WalletAddress,
            Role = string.Empty,
            PublicKey = m.PublicKey,
            EncryptedAesKey = null,
        };

        // ───────────────────────── domain → Dto ─────────────────────────

        public static PatientDto ToPatientDto(Patient p) => new()
        {
            Id = p.Id,
            IdentityId = p.IdentityId,
            FirstName = p.FirstName,
            LastName = p.LastName,
            WalletAddress = p.WalletAddress,
            CNP = p.CNP,
            DateOfBirth = p.DateOfBirth,
            PublicKey = p.PublicKey,
            EncryptedAesKey = p.EncryptedAesKey,
        };

        public static DoctorDto ToDoctorDto(Doctor d) => new()
        {
            Id = d.Id,
            IdentityId = d.IdentityId,
            FirstName = d.FirstName,
            LastName = d.LastName,
            WalletAddress = d.WalletAddress,
            Specialization = d.Specialization,
            LicenseNumber = d.LicenseNumber,
            EntityAffiliation = d.EntityAffiliation,
            PublicKey = d.PublicKey,
        };

        public static LaboratoryTechnicianDto ToLaboratoryTechnicianDto(LaboratoryTechnician l) => new()
        {
            Id = l.Id,
            IdentityId = l.IdentityId,
            FirstName = l.FirstName,
            LastName = l.LastName,
            WalletAddress = l.WalletAddress,
            Specialization = l.Specialization,
            EntityAffiliation = l.EntityAffiliation,
            PublicKey = l.PublicKey,
        };

        public static PharmacistDto ToPharmacistDto(Pharmacist ph) => new()
        {
            Id = ph.Id,
            IdentityId = ph.IdentityId,
            FirstName = ph.FirstName,
            LastName = ph.LastName,
            WalletAddress = ph.WalletAddress,
            LicenseNumber = ph.LicenseNumber,
            EntityAffiliation = ph.EntityAffiliation,
            PublicKey = ph.PublicKey,
        };

        public static MedicalAssistantDto ToMedicalAssistantDto(MedicalAssistant m) => new()
        {
            Id = m.Id,
            IdentityId = m.IdentityId,
            FirstName = m.FirstName,
            LastName = m.LastName,
            WalletAddress = m.WalletAddress,
            EntityAffiliation = m.EntityAffiliation,
            PublicKey = m.PublicKey,
        };

        // ───────────────────────── IReadOnlyList<Patient> → IReadOnlyList<PatientDto> ─────────────────────────

        public static IReadOnlyList<PatientDto> ToPatientDtoList(IEnumerable<Patient> patients) =>
            patients.Select(ToPatientDto).ToList();
    }
}