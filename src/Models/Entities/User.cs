using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace myprofile_backend.Models.Entities
{
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

        [Column("title"), MaxLength(255)]
        public string? Title { get; set; }

        [Column("location")]
        public string? Location { get; set; }

        [Column("skills")]
        public List<string>? Skills { get; set; }

        /// <summary>
        /// Stored as JSONB in CockroachDB. 
        /// EF Core 8+ and npgsql map this automatically to a class or list of classes.
        /// </summary>
        [Column("experience", TypeName = "jsonb")]
        public List<UserExperience>? Experience { get; set; }

    }

    public class UserExperience
    {
        [JsonPropertyName("company")]
        public string Company { get; set; } = string.Empty;

        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("active_years")]
        public string ActiveYears { get; set; } = string.Empty;

        [JsonPropertyName("current")]
        public bool IsCurrent { get; set; }
    }
}
