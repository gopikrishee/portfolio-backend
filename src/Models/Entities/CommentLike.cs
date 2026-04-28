using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace myprofile_backend.Models.Entities
{
    [Table("comment_likes", Schema = "public")]
    public class CommentLike
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("comment_id")]
        public Guid CommentId { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        // --- Navigation Properties ---

        [ForeignKey("CommentId")]
        public required virtual Comment Comment { get; set; }

        [ForeignKey("UserId")]
        public required virtual User User { get; set; }
    }
}
