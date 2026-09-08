import { sheetsService } from './sheetsService.js';
import { userService } from './userService.js';
import {
  BlogDto,
  RawBlogRow,
  RawBlogDetailsRow,
  BlogDetailsDto,
  CreateBlogInput,
  CreateBlogResponse,
  ContentBlock
} from '../types.js';
import * as crypto from 'crypto';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export class BlogService {
  async getBlogsWithAuthor(pageNumber: number = 1, pageSize: number = 10, forceRefresh: boolean = false): Promise<BlogDto[]> {
    try {
      const [rawBlogs, users] = await Promise.all([
        sheetsService.getBlogs(forceRefresh),
        userService.getAllUsers(false)
      ]);

      console.log(`[BlogService] rawBlogs fetched count: ${rawBlogs.length}, users count: ${users.length}`);

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

        const userId = b.author_id || (b as any).userId || '28fbb257-ac9e-4b22-b294-cf341ec6db04';
        const userName = userMap.get(userId) || 'GOPI KRISHAN S';
        const viewCount = typeof b.view_count === 'number' ? b.view_count : parseInt(String(b.view_count || 0), 10) || 0;

        return {
          id: b.id || '',
          userId,
          userName,
          title: b.title || '',
          slug: b.slug || slugify(b.title || 'untitled'),
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
    const blogs = await this.getBlogsWithAuthor(1, 1000);
    return blogs.find((b) => b.id === id || b.slug === id) || null;
  }

  async getBlogDetailsById(blogId: string): Promise<BlogDetailsDto | null> {
    try {
      const rawRows = await sheetsService.getBlogDetails(blogId);
      if (!rawRows || rawRows.length === 0) {
        // If no separate details row exists yet, construct from blog overview
        const blog = await this.getBlogById(blogId);
        if (!blog) return null;

        return {
          id: crypto.randomUUID(),
          blogId: blog.id,
          title: blog.title,
          subtitle: blog.excerpt || '',
          tags: blog.tags,
          textcontents: blog.excerpt ? [blog.excerpt] : [],
          blockquote: [],
          codesnippet: [],
          contentBlocks: blog.excerpt
            ? [{ id: crypto.randomUUID(), type: 'text', content: blog.excerpt, order: 0 }]
            : [],
          authorId: blog.userId,
          createdAt: blog.createdAt,
          updatedAt: blog.updatedAt
        };
      }

      const row = rawRows[0];
      return this.formatBlogDetailsRow(row);
    } catch (err) {
      console.error('[BlogService] Error fetching blog details:', err);
      return null;
    }
  }

  async getAllBlogDetails(): Promise<BlogDetailsDto[]> {
    const rawRows = await sheetsService.getBlogDetails();
    return rawRows.map((r) => this.formatBlogDetailsRow(r));
  }

  private formatBlogDetailsRow(row: RawBlogDetailsRow): BlogDetailsDto {
    const parseArray = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field.map(String);
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          return [field];
        }
      }
      return [String(field)];
    };

    let contentBlocks: ContentBlock[] = [];
    if (row.content_blocks) {
      if (Array.isArray(row.content_blocks)) {
        contentBlocks = row.content_blocks as ContentBlock[];
      } else if (typeof row.content_blocks === 'string') {
        try {
          contentBlocks = JSON.parse(row.content_blocks);
        } catch {
          contentBlocks = [];
        }
      }
    }

    let tags: string[] = [];
    if (row.tags) {
      if (Array.isArray(row.tags)) tags = row.tags;
      else if (typeof row.tags === 'string') {
        try {
          tags = JSON.parse(row.tags);
        } catch {
          tags = row.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    return {
      id: row.id || crypto.randomUUID(),
      blogId: row.blog_id || row.id || '',
      title: row.title || '',
      subtitle: row.subtitle || '',
      tags,
      textcontents: parseArray(row.textcontents),
      blockquote: parseArray(row.blockquote),
      codesnippet: parseArray(row.codesnippet),
      contentBlocks,
      authorId: row.author_id || '28fbb257-ac9e-4b22-b294-cf341ec6db04',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  /**
   * Create a new blog post
   * Stores overview in "blogs" and complete details in "blog_details"
   */
  async createBlog(input: CreateBlogInput, explicitAccessToken?: string): Promise<CreateBlogResponse> {
    if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
      throw new Error('Title is required and must be a non-empty string');
    }

    const token = explicitAccessToken || input.accessToken;

    const title = input.title.trim();
    const subtitle = (input.subtitle || input.subtile || '').trim();
    const now = new Date().toISOString();
    const blogId = crypto.randomUUID();
    const detailsId = crypto.randomUUID();
    const authorId = input.userId || input.authorId || '28fbb257-ac9e-4b22-b294-cf341ec6db04';

    // Normalize tags
    let tags: string[] = [];
    if (Array.isArray(input.tags)) {
      tags = input.tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof input.tags === 'string') {
      try {
        const parsed = JSON.parse(input.tags);
        if (Array.isArray(parsed)) tags = parsed.map(String);
      } catch {
        tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Normalize dynamic inputs: textcontents, blockquotes, codesnippets
    const textcontents: string[] = [];
    if (Array.isArray(input.textcontents)) {
      input.textcontents.forEach((t) => {
        if (typeof t === 'string' && t.trim()) textcontents.push(t.trim());
      });
    } else if (typeof input.textcontents === 'string' && input.textcontents.trim()) {
      textcontents.push(input.textcontents.trim());
    }

    const blockquote: string[] = [];
    if (Array.isArray(input.blockquote)) {
      input.blockquote.forEach((q) => {
        if (typeof q === 'string' && q.trim()) blockquote.push(q.trim());
      });
    } else if (typeof input.blockquote === 'string' && input.blockquote.trim()) {
      blockquote.push(input.blockquote.trim());
    }

    const codesnippet: string[] = [];
    if (Array.isArray(input.codesnippet)) {
      input.codesnippet.forEach((c) => {
        if (typeof c === 'string' && c.trim()) {
          codesnippet.push(c.trim());
        } else if (typeof c === 'object' && c && (c as any).code) {
          codesnippet.push((c as any).code);
        }
      });
    } else if (typeof input.codesnippet === 'string' && input.codesnippet.trim()) {
      codesnippet.push(input.codesnippet.trim());
    }

    // Build unified contentBlocks list preserving order
    const contentBlocks: ContentBlock[] = [];
    let orderIndex = 0;

    if (Array.isArray(input.contentBlocks) && input.contentBlocks.length > 0) {
      input.contentBlocks.forEach((block) => {
        if (block && block.content) {
          const type = (block.type as any) || 'text';
          const validBlock: ContentBlock = {
            id: block.id || crypto.randomUUID(),
            type: ['text', 'blockquote', 'codesnippet'].includes(type) ? type : 'text',
            content: block.content,
            order: block.order !== undefined ? block.order : orderIndex++,
            language: block.language || undefined
          };
          contentBlocks.push(validBlock);

          // Synchronize arrays if not already present
          if (validBlock.type === 'text' && !textcontents.includes(validBlock.content)) {
            textcontents.push(validBlock.content);
          } else if (validBlock.type === 'blockquote' && !blockquote.includes(validBlock.content)) {
            blockquote.push(validBlock.content);
          } else if (validBlock.type === 'codesnippet' && !codesnippet.includes(validBlock.content)) {
            codesnippet.push(validBlock.content);
          }
        }
      });
    } else {
      // Build contentBlocks sequentially from textcontents, blockquotes, and codesnippets
      textcontents.forEach((text) => {
        contentBlocks.push({
          id: crypto.randomUUID(),
          type: 'text',
          content: text,
          order: orderIndex++
        });
      });

      blockquote.forEach((quote) => {
        contentBlocks.push({
          id: crypto.randomUUID(),
          type: 'blockquote',
          content: quote,
          order: orderIndex++
        });
      });

      codesnippet.forEach((code) => {
        contentBlocks.push({
          id: crypto.randomUUID(),
          type: 'codesnippet',
          content: code,
          order: orderIndex++
        });
      });
    }

    // 1. Prepare "blogs" entity (Overview ONLY - preserves existing contract)
    const excerpt = subtitle || (textcontents.length > 0 ? textcontents[0].slice(0, 160) : 'Blog post');
    const slug = slugify(title) + '-' + blogId.slice(0, 8);

    const blogOverview: BlogDto = {
      id: blogId,
      userId: authorId,
      userName: 'GOPI KRISHAN S',
      title,
      slug,
      excerpt,
      coverImageUrl: input.coverImageUrl || null,
      status: input.status || 'published',
      tags,
      viewCount: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // 2. Prepare "blog_details" entity (COMPLETE input details)
    const blogDetails: BlogDetailsDto = {
      id: detailsId,
      blogId,
      title,
      subtitle,
      tags,
      textcontents,
      blockquote,
      codesnippet,
      contentBlocks,
      authorId,
      createdAt: now,
      updatedAt: now
    };

    // 3. Save to Google Sheets service (Google Sheets API v4 + Local persistence)
    const syncResult = await sheetsService.saveBlog(blogOverview, blogDetails, token);

    return {
      message: 'Blog created successfully',
      blog: blogOverview,
      blogDetails,
      googleSheetsSync: {
        spreadsheetId: sheetsService.getSpreadsheetId(),
        blogsSheet: 'blogs (Overview preserved)',
        blogDetailsSheet: 'blog_details (Complete details saved)',
        syncedToGoogleSheets: syncResult.syncedToSheets,
        syncNote: syncResult.note,
        details: syncResult.sheetsSyncDetails
      }
    };
  }
}

export const blogService = new BlogService();
