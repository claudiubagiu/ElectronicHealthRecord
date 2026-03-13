namespace Auth.Api.Models.Messages
{
    public class UserCreatedResponseEvent
    {
        public required string Id { get; set; }
        public required string IdentityId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
    }
}
