namespace AccessRequests.Api.Models.DTOs
{
    public class AccessRequestHistoryDto
    {
        public Guid Id { get; set; }
        public Guid AccessRequestId { get; set; }
        public string Action { get; set; } = string.Empty;
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public Guid PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
