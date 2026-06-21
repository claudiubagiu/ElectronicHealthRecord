namespace AccessRequests.Api.Models.Messages
{
    /// <summary>
    /// Received from Users.Api on "accessrequest-aes-key-rotated-queue"
    /// after a patient rotates their PatientMasterKey. Updates this
    /// service's denormalized User.EncryptedAesKey copy.
    ///
    /// Note: this is unrelated to Envelope.EncryptedAesKey, which holds the
    /// patient's key re-wrapped for a specific authorized user and is
    /// rotated separately via the bulk envelope-rotation endpoint — that
    /// one requires client-side re-encryption per recipient and can't be
    /// derived from this event alone.
    /// </summary>
    public class AesKeyRotatedEvent
    {
        public required string IdentityId { get; set; }
        public required Guid UserId { get; set; }
        public required string EncryptedAesKey { get; set; }
    }
}