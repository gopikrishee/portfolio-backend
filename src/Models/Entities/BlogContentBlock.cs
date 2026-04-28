using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace myprofile_backend.Models.Entities
{
    [Table("blog_content_blocks", Schema = "public")]
    public class BlogContentBlock
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("blog_id")]
        public Guid BlogId { get; set; }

        [Required]
        [Column("block_type")]
        public required string BlockType { get; set; } // 'text', 'image', 'code', etc.

        [Required]
        [Column("position")]
        public long Position { get; set; }

        [Column("text_content")]
        public string? TextContent { get; set; }

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("image_alt")]
        public string? ImageAlt { get; set; }

        [Column("image_caption")]
        public string? ImageCaption { get; set; }

        [Column("code_snippet")]
        public string? CodeSnippet { get; set; }

        [Column("code_language")]
        public string? CodeLanguage { get; set; }

        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        // --- Navigation Property ---

        [ForeignKey("BlogId")]
        public required virtual Blog Blog { get; set; }
    }
}
