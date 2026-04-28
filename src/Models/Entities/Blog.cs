using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace myprofile_backend.Models.Entities
{
    [Table("blogs", Schema = "public")]
    public class Blog
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("author_id")]
        public required Guid UserId { get; set; }

        [Required]
        [Column("title")]
        public required string Title { get; set; }

        [Required]
        [Column("slug")]
        public required string Slug { get; set; }

        [MaxLength(500)]
        [Column("excerpt")]
        public string? Excerpt { get; set; }

        [Column("cover_image_url")]
        public string? CoverImageUrl { get; set; }

        [Required]
        [Column("status")]
        public string Status { get; set; } = "draft";

        [Column("tags")]
        public List<string>? Tags { get; set; }

        [Column("view_count")]
        public long ViewCount { get; set; } = 0;

        [Column("published_at")]
        public DateTimeOffset? PublishedAt { get; set; }

        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Column("updated_at")]
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // --- Navigation Properties ---

        [ForeignKey("UserId")]
        public virtual required User Author { get; set; }
    }
}
