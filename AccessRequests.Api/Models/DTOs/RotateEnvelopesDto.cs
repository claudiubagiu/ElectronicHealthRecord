namespace AccessRequests.Api.Models.DTOs
{
    /// <summary>
    /// One entry in a batch envelope-rotation request: re-wraps the
    /// patient's new PatientMasterKey for a single authorized user
    /// (doctor, lab tech, pharmacist, medical assistant, etc.) who
    /// currently holds an active envelope for this patient.
    /// </summary>
    public class RotateEnvelopeEntryDto
    {
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }

    /// <summary>
    /// Sent by the patient's frontend after generating a new
    /// PatientMasterKey client-side and re-encrypting it (ECIES) for every
    /// user that currently has an active envelope. Replaces each existing
    /// Envelope.EncryptedAesKey in place — access stays intact, only the
    /// underlying key material changes.
    /// </summary>
    public class RotateEnvelopesDto
    {
        public required List<RotateEnvelopeEntryDto> Entries { get; set; }
    }
}