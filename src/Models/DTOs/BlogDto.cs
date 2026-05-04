using System;
using System.Collections.Generic;

namespace myprofile_backend.Models.DTOs
{
    public class BlogDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Excerpt { get; set; }
        public string? CoverImageUrl { get; set; }
        public string Status { get; set; } = "draft";
        public List<string>? Tags { get; set; }
        public long ViewCount { get; set; }
        public DateTimeOffset? PublishedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
