using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace myprofile_backend.Models.Entities
{
    [Table("users", Schema = "public")] // Note: This table is named "users" in the DB but contains "Like" entities for blog likes. This seems like a potential naming conflict or design choice.
    public class Like
    {
        [Key]
        [Column("userId")]
        public Guid UserId { get; set; }
        
        [Key]
        [Column("blogId")]
        public Guid BlogId { get; set; }

        [ForeignKey("UserId")]
        public required User User {get; set; }

        [ForeignKey("BlogId")]
        public required Blog Blog { get; set; }

    }
}
