namespace Diagnostics.Api.Models.DTOs
{
    public class FileDto
    {
        public required FileStream Stream { get; set; }
        public required string ContentType { get; set; }
        public required string FileName { get; set; }
    }
}
