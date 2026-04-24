using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("blog_images", Schema = "public")]
public class BlogImage
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("blog_id")]
    public Guid BlogId { get; set; }

    [Required]
    [Column("url")]
    public required string Url { get; set; }

    [Column("alt_text")]
    public string? AltText { get; set; }

    [Column("caption")]
    public string? Caption { get; set; }

    [Column("display_order")]
    public long DisplayOrder { get; set; } = 0;

    [Column("uploaded_at")]
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    // --- Navigation Property ---

    [ForeignKey("BlogId")]
    public required virtual Blog Blog { get; set; }
}