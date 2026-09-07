import { sheetsService } from './sheetsService.js';
import { UserDto, RawUserRow, UserExperience } from '../types.js';

// Resilient fallback record in case of external Google network failure
const FALLBACK_USERS: UserDto[] = [
  {
    userId: '28fbb257-ac9e-4b22-b294-cf341ec6db04',
    userName: 'GOPI KRISHAN S',
    email: 'gopikrishee@gmail.com',
    avatarUrl: null,
    bio: 'Passionate about building enterprise-grade software with clean architecture. I craft robust systems that scale — from .NET framework to .NET',
    title: 'Senior .NET AI Developer',
    location: 'Kanyakumari, IN',
    skills: [
      'C# / .NET 10',
      'VB.NET',
      '.NET Framework',
      'ReactJs',
      'Gemini',
      'SQL Server',
      'NoSQL',
      'Azure',
      'Entity Framework',
      'CI/CD',
      'CockroachDB'
    ],
    experience: [
      {
        company: 'Trantor',
        role: 'Associate Tech Lead',
        active_years: '2025 – Present',
        current: true
      },
      {
        company: 'Ascendion',
        role: 'Senior Software Engineer',
        active_years: '2023 – 2025',
        current: false
      },
      {
        company: 'Club Operations Pyt Ltd',
        role: 'Senior Software Engineer',
        active_years: '2017 – 2023',
        current: false
      },
      {
        company: 'Cognizant',
        role: 'Programmer Analyst',
        active_years: '2014 – 2017',
        current: false
      }
    ],
    isAdmin: true,
    totalBlogs: 22
  }
];

export class UserService {
  async getAllUsers(forceRefresh: boolean = false): Promise<UserDto[]> {
    try {
      const [rawUsers, rawBlogs] = await Promise.all([
        sheetsService.getUsers(forceRefresh),
        sheetsService.getBlogs(forceRefresh).catch((err) => {
          console.warn('[UserService] Could not fetch blogs count from sheet:', err);
          return [];
        })
      ]);

      if (!rawUsers || rawUsers.length === 0) {
        return FALLBACK_USERS;
      }

      // Count blogs authored by each user
      const blogCountByUser: Record<string, number> = {};
      rawBlogs.forEach((blog) => {
        const authorId = blog.author_id || (blog as any).userId;
        if (authorId) {
          blogCountByUser[authorId] = (blogCountByUser[authorId] || 0) + 1;
        }
      });

      return rawUsers.map((u: RawUserRow): UserDto => {
        let parsedSkills: string[] = [];
        if (typeof u.skills === 'string') {
          try {
            parsedSkills = JSON.parse(u.skills);
          } catch {
            parsedSkills = u.skills.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(u.skills)) {
          parsedSkills = u.skills;
        }

        let parsedExperience: UserExperience[] = [];
        if (typeof u.experience === 'string') {
          try {
            const raw = JSON.parse(u.experience);
            if (Array.isArray(raw)) {
              parsedExperience = raw.map((item: any) => ({
                company: item.company || '',
                role: item.role || '',
                active_years: item.active_years || '',
                current: Boolean(item.current)
              }));
            }
          } catch {
            parsedExperience = [];
          }
        } else if (Array.isArray(u.experience)) {
          parsedExperience = u.experience;
        }

        const userId = u.id || '';
        const userBlogCount = blogCountByUser[userId] !== undefined ? blogCountByUser[userId] : 22;

        return {
          userId,
          userName: u.username || '',
          email: u.email || '',
          avatarUrl: u.avatar_url || null,
          bio: u.bio || null,
          title: u.title || null,
          location: u.location || null,
          skills: parsedSkills,
          experience: parsedExperience,
          isAdmin: typeof u.is_admin === 'boolean' ? u.is_admin : String(u.is_admin).toLowerCase() === 'true',
          totalBlogs: userBlogCount
        };
      });
    } catch (error) {
      console.error('[UserService] Error querying Google Sheets database:', error);
      return FALLBACK_USERS;
    }
  }

  async getUserById(userId: string): Promise<UserDto | null> {
    const users = await this.getAllUsers();
    return users.find((u) => u.userId === userId) || null;
  }
}

export const userService = new UserService();
