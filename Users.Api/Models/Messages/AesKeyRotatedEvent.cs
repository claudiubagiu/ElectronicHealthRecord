namespace Users.Api.Models.Messages
{
    /// <summary>
    /// Received from Auth.Api on "aes-key-rotated-queue" after a patient
    /// rotates their PatientMasterKey. Users.Api updates its own local
    /// Patient.EncryptedAesKey copy (matched by IdentityId), then fans this
    /// same event out to AccessRequests.Api, MedicalData.Api, and
    /// Diagnostics.Api — which match by UserId instead, since they never
    /// saw IdentityId in the first place.
    /// </summary>
    public class AesKeyRotatedEvent
    {
        public required string IdentityId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}