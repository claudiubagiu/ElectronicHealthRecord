namespace Users.Api.Models.Messages
{
    public class UserCreatedEvent
    {
        public required string Id { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Role { get; set; }
    }
}
