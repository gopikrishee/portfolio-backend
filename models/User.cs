using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("users", Schema = "public")]
public class User
{
    [Key]
    [Column("id")]
    public required Guid UserId { get; set; }
    
    [Column("username")]
    public required string UserName { get; set; }
    
    [Column("email")]
    public required string Email { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl {get; set; }

    [Column("bio"), MaxLength(500)]
    public string? Bio {get; set; }

    [Column("designation"), MaxLength(255)]
    public string? Designation { get; set; }

}