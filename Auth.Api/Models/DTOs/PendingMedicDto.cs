namespace Auth.Api.Models.DTOs
{
    /// <summary>
    /// Represents a medical staff user awaiting administrator approval.
    /// </summary>
    public class PendingMedicDto
    {
        public required string Id { get; set; }
        public required string UserName { get; set; }
        public required string Email { get; set; }
        public required string WalletAddress { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required List<string> Roles { get; set; }
        public bool IsApproved { get; set; }
    }
}