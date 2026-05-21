using System;

namespace myprofile_backend.Models.DTOs
{
    public class BlogContentBlockDto
    {
        public Guid Id { get; set; }
        public Guid BlogId { get; set; }
        public string BlockType { get; set; } = string.Empty;
        public long Position { get; set; }
        public string? TextContent { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageAlt { get; set; }
        public string? ImageCaption { get; set; }
        public string? CodeSnippet { get; set; }
        public string? CodeLanguage { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
