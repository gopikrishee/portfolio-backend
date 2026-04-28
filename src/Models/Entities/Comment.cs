using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace myprofile_backend.Models.Entities
{
    [Table("comments", Schema = "public")]
    public class Comment
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("blog_id")]
        public Guid BlogId { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        // Nullable because top-level comments don't have a parent
        [Column("parent_comment_id")]
        public Guid? ParentCommentId { get; set; }

        [Required]
        [Column("content")]
        public required string Content { get; set; }

        [Column("is_edited")]
        public bool IsEdited { get; set; } = false;

        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Column("updated_at")]
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // --- Navigation Properties ---

        [ForeignKey("BlogId")]
        public required virtual Blog Blog { get; set; }

        [ForeignKey("UserId")]
        public required virtual User User { get; set; }

        // Self-referencing relationship for threaded comments
        [ForeignKey("ParentCommentId")]
        public virtual Comment? ParentComment { get; set; }

        public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
    }
}
