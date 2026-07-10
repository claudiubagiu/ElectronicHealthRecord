using Auth.Api.Domain.Models;

namespace Auth.Api.Models.Domain
{
    public class User
    {
        public required string Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public ApplicationUser? ApplicationUser { get; set; }
    }
}
