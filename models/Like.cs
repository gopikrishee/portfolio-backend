using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("users", Schema = "public")]
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