import { RawUserRow, RawBlogRow, RawBlogDetailsRow, BlogDto, BlogDetailsDto } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

export function extractSpreadsheetId(idOrUrl: string = ''): string {
  if (!idOrUrl) return '1qgh0-fu8vpqufF_MK2W1-s_kEWaVidGqfFiOzc3XUNM';
  const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return idOrUrl.trim();
}

export const SPREADSHEET_ID = extractSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID || '1qgh0-fu8vpqufF_MK2W1-s_kEWaVidGqfFiOzc3XUNM');
export const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class GoogleSheetsService {
  private spreadsheetId: string;
  private cache = new Map<string, CacheEntry<any>>();
  private cacheTtlMs = 30000; // 30 seconds cache
  private localBlogs: BlogDto[] = [];
  private localBlogDetails: BlogDetailsDto[] = [];
  private dataDir: string;
  private dataFilePath: string;

  constructor(spreadsheetId: string = SPREADSHEET_ID) {
    this.spreadsheetId = spreadsheetId;
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dataFilePath = path.join(this.dataDir, 'local_storage.json');
    this.loadLocalStorage();
  }

  private loadLocalStorage() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.localBlogs = parsed.blogs || [];
        this.localBlogDetails = parsed.blogDetails || [];
        console.log(`[GoogleSheetsService] Loaded ${this.localBlogs.length} local blogs from disk`);
      }
    } catch (e) {
      console.warn('[GoogleSheetsService] Could not read local storage file, starting fresh', e);
    }
  }

  private saveLocalStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        this.dataFilePath,
        JSON.stringify(
          {
            blogs: this.localBlogs,
            blogDetails: this.localBlogDetails
          },
          null,
          2
        )
      );
    } catch (e) {
      console.warn('[GoogleSheetsService] Could not persist to local storage file', e);
    }
  }

  /**
   * Clear in-memory cache for specific sheet or all sheets
   */
  clearCache(sheetName?: string) {
    if (sheetName) {
      this.cache.delete(`sheet_${sheetName}`);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Fetch and parse rows from a specific sheet in the Google Workbook
   */
  async fetchSheetRows<T = Record<string, any>>(sheetName: string, forceRefresh: boolean = false): Promise<T[]> {
    const cacheKey = `sheet_${sheetName}`;
    const cached = this.cache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!res.ok) {
        throw new Error(`Google Sheets responded with status ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Invalid JSON structure returned by Google Sheets GViz endpoint');
      }

      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);

      if (!parsed.table || !parsed.table.cols || !parsed.table.rows) {
        throw new Error('Unexpected sheet schema returned by Google Sheets');
      }

      const cols = parsed.table.cols.map((c: any, i: number) => (c && c.label ? c.label.trim() : `col_${i}`));

      // If the sheet doesn't exist, Google Sheets gviz returns the first sheet instead of an error.
      // We detect this by checking if the requested sheet was "blog_details" but the columns belong to "users"
      if (sheetName === 'blog_details' && cols.includes('bio') && cols.includes('username')) {
        return [];
      }

      const rows: T[] = parsed.table.rows.map((r: any) => {
        const rowObj: Record<string, any> = {};
        if (r.c) {
          r.c.forEach((cell: any, i: number) => {
            const colName = cols[i];
            if (colName) {
              rowObj[colName] = cell && cell.v !== undefined ? cell.v : null;
            }
          });
        }
        return rowObj as T;
      });

      this.cache.set(cacheKey, { data: rows, timestamp: Date.now() });
      return rows;
    } catch (error: any) {
      console.error(`[GoogleSheetsService] Error fetching sheet "${sheetName}":`, error?.message || error);

      if (cached) {
        console.warn(`[GoogleSheetsService] Returning stale cached data for "${sheetName}"`);
        return cached.data;
      }

      return [];
    }
  }

  /**
   * Get raw user rows from the "users" sheet
   */
  async getUsers(forceRefresh: boolean = false): Promise<RawUserRow[]> {
    return this.fetchSheetRows<RawUserRow>('users', forceRefresh);
  }

  /**
   * Get raw blog rows from the "blogs" sheet + locally saved blogs
   */
  async getBlogs(forceRefresh: boolean = false): Promise<RawBlogRow[]> {
    const remoteBlogs = await this.fetchSheetRows<RawBlogRow>('blogs', forceRefresh);

    // Merge remote blogs with local newly created blogs (prevent duplicates by ID)
    const existingIds = new Set(remoteBlogs.map((b) => b.id));
    const newlyAdded: RawBlogRow[] = this.localBlogs
      .filter((b) => !existingIds.has(b.id))
      .map((b) => ({
        id: b.id,
        author_id: b.userId,
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        cover_image_url: b.coverImageUrl,
        status: b.status,
        tags: JSON.stringify(b.tags),
        view_count: b.viewCount,
        published_at: b.publishedAt,
        created_at: b.createdAt,
        updated_at: b.updatedAt
      }));

    return [...newlyAdded, ...remoteBlogs];
  }

  /**
   * Get raw blog details from "blog_details" sheet + locally saved blog details
   */
  async getBlogDetails(blogId?: string, forceRefresh: boolean = false): Promise<RawBlogDetailsRow[]> {
    const remoteDetails = await this.fetchSheetRows<RawBlogDetailsRow>('blog_details', forceRefresh);

    const existingIds = new Set(remoteDetails.map((d) => d.id || d.blog_id));
    const newlyAdded: RawBlogDetailsRow[] = this.localBlogDetails
      .filter((d) => !existingIds.has(d.id) && !existingIds.has(d.blogId))
      .map((d) => ({
        id: d.id,
        blog_id: d.blogId,
        title: d.title,
        subtitle: d.subtitle,
        tags: JSON.stringify(d.tags),
        textcontents: JSON.stringify(d.textcontents),
        blockquote: JSON.stringify(d.blockquote),
        codesnippet: JSON.stringify(d.codesnippet),
        content_blocks: JSON.stringify(d.contentBlocks),
        author_id: d.authorId,
        created_at: d.createdAt,
        updated_at: d.updatedAt
      }));

    const all = [...newlyAdded, ...remoteDetails];
    if (blogId) {
      return all.filter((d) => d.blog_id === blogId || d.id === blogId);
    }
    return all;
  }

  /**
   * Save a new blog and its complete details
   * Saves to:
   * 1. In-memory / persistent disk storage
   * 2. Google Sheets via Webhook (if GOOGLE_SHEETS_WEBHOOK_URL is configured)
   */
  async saveBlog(blog: BlogDto, details: BlogDetailsDto): Promise<{ syncedToSheets: boolean; note: string }> {
    // 1. Save to local storage & in-memory
    this.localBlogs.unshift(blog);
    this.localBlogDetails.unshift(details);
    this.saveLocalStorage();

    // Invalidate cache
    this.clearCache('blogs');
    this.clearCache('blog_details');

    let syncedToSheets = false;
    let note = 'Saved successfully to backend storage';

    // 2. Attempt Google Sheets Webhook sync if configured
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || GOOGLE_SHEETS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const payload = {
          action: 'create_blog',
          blog_overview: {
            id: blog.id,
            author_id: blog.userId,
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.excerpt,
            cover_image_url: blog.coverImageUrl || '',
            status: blog.status,
            tags: blog.tags,
            view_count: blog.viewCount,
            published_at: blog.publishedAt,
            created_at: blog.createdAt,
            updated_at: blog.updatedAt
          },
          blog_details: {
            id: details.id,
            blog_id: details.blogId,
            title: details.title,
            subtitle: details.subtitle,
            tags: details.tags,
            textcontents: details.textcontents,
            blockquote: details.blockquote,
            codesnippet: details.codesnippet,
            content_blocks: details.contentBlocks,
            author_id: details.authorId,
            created_at: details.createdAt,
            updated_at: details.updatedAt
          }
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          syncedToSheets = true;
          note = 'Saved and synchronized directly with Google Sheets workbook';
          console.log('[GoogleSheetsService] Successfully synced to Google Sheets webhook');
        } else {
          note = `Saved to backend. Webhook returned status ${response.status}`;
        }
      } catch (err: any) {
        console.error('[GoogleSheetsService] Webhook sync failed:', err);
        note = `Saved to backend. Webhook error: ${err.message}`;
      }
    } else {
      note = 'Saved in backend. To enable direct write to Google Sheets, set GOOGLE_SHEETS_WEBHOOK_URL or deploy the provided Apps Script.';
    }

    return { syncedToSheets, note };
  }

  getSpreadsheetUrl(): string {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit?gid=0#gid=0`;
  }
}

export const sheetsService = new GoogleSheetsService();
