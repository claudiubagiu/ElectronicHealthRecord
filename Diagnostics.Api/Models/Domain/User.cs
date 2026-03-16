namespace Diagnostics.Api.Models.Domain
{
    public class User
    {
        public required Guid Id { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string WalletAddress { get; set; }
        public required string Role { get; set; }

        public ICollection<Diagnostic>? DiagnosticsAsPatient { get; set; }
        public ICollection<Diagnostic>? DiagnosticsAsDoctor { get; set; }
    }
}
