import { sheetsService } from './sheetsService.js';
import { userService } from './userService.js';
import { BlogDto, RawBlogRow } from '../types.js';

export class BlogService {
  async getBlogsWithAuthor(pageNumber: number = 1, pageSize: number = 10, forceRefresh: boolean = false): Promise<BlogDto[]> {
    try {
      const [rawBlogs, users] = await Promise.all([
        sheetsService.getBlogs(forceRefresh),
        userService.getAllUsers(false)
      ]);

      const userMap = new Map<string, string>();
      users.forEach((u) => userMap.set(u.userId, u.userName));

      // Parse and format raw blogs
      const blogs: BlogDto[] = rawBlogs.map((b: RawBlogRow) => {
        let tags: string[] = [];
        if (typeof b.tags === 'string') {
          try {
            tags = JSON.parse(b.tags);
          } catch {
            tags = b.tags.split(',').map((t) => t.trim()).filter(Boolean);
          }
        } else if (Array.isArray(b.tags)) {
          tags = b.tags;
        }

        const userId = b.author_id || (b as any).userId || '';
        const userName = userMap.get(userId) || 'GOPI KRISHAN S';

        const viewCount = typeof b.view_count === 'number' ? b.view_count : parseInt(String(b.view_count || 0), 10) || 0;

        return {
          id: b.id || '',
          userId,
          userName,
          title: b.title || '',
          slug: b.slug || '',
          excerpt: b.excerpt || null,
          coverImageUrl: b.cover_image_url || null,
          status: b.status || 'published',
          tags,
          viewCount,
          publishedAt: b.published_at || null,
          createdAt: b.created_at || new Date().toISOString(),
          updatedAt: b.updated_at || new Date().toISOString()
        };
      });

      // Sort by createdAt descending
      blogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Pagination
      const pNumber = Math.max(1, pageNumber || 1);
      const pSize = Math.max(1, pageSize || 10);
      const skip = (pNumber - 1) * pSize;

      return blogs.slice(skip, skip + pSize);
    } catch (error) {
      console.error('[BlogService] Error fetching blogs from Google Sheets:', error);
      return [];
    }
  }

  async getBlogById(id: string): Promise<BlogDto | null> {
    const blogs = await this.getBlogsWithAuthor(1, 100);
    return blogs.find((b) => b.id === id) || null;
  }
}

export const blogService = new BlogService();
