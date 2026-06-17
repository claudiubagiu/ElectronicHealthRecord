namespace AccessRequests.Api.Models.Domain
{
    public class AccessRequestHistory
    {
        public Guid Id { get; set; }
        public Guid AccessRequestId { get; set; }
        public string Action { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }

        public AccessRequest? AccessRequest { get; set; }
    }
}
