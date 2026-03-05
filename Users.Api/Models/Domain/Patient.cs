namespace Users.Api.Models.Domain
{
    public class Patient
    {
        public required Guid Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
    }
}
