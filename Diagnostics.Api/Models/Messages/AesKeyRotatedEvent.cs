namespace Diagnostics.Api.Models.Messages
{
    /// <summary>
    /// Received from Users.Api on "diagnostics-aes-key-rotated-queue" after
    /// a patient rotates their PatientMasterKey. Updates this service's
    /// denormalized User.EncryptedAesKey copy, keyed by UserId (this
    /// service never saw the patient's Auth.Api identity id).
    /// </summary>
    public class AesKeyRotatedEvent
    {
        public required string IdentityId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}