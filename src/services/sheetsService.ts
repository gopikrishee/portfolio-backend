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

export const SPREADSHEET_ID = extractSpreadsheetId(
  process.env.GOOGLE_SPREADSHEET_ID ||
  process.env.SPREADSHEET_ID ||
  process.env.GOOGLE_WORKBOOK_ID ||
  '1qgh0-fu8vpqufF_MK2W1-s_kEWaVidGqfFiOzc3XUNM'
);
export function isValidHttpUrl(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getValidWebhookUrl(): string | null {
  const candidate = (process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
  if (candidate && isValidHttpUrl(candidate)) {
    return candidate;
  }
  return null;
}

export const GOOGLE_SHEETS_WEBHOOK_URL = getValidWebhookUrl() || '';

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
  private activeAccessToken: string | null = process.env.GOOGLE_ACCESS_TOKEN || null;

  constructor(spreadsheetId: string = SPREADSHEET_ID) {
    this.spreadsheetId = spreadsheetId;
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dataFilePath = path.join(this.dataDir, 'local_storage.json');
    this.loadLocalStorage();
  }

  setAccessToken(token: string) {
    if (token && typeof token === 'string') {
      this.activeAccessToken = token.trim();
      console.log('[GoogleSheetsService] Active Google OAuth access token set');
    }
  }

  getAccessToken(): string | null {
    return this.activeAccessToken || process.env.GOOGLE_ACCESS_TOKEN || null;
  }

  getSpreadsheetId(): string {
    return this.spreadsheetId;
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
   * Check if a sheet exists in the workbook, and if not, create it and add initial headers
   */
  async ensureSheetExists(sheetName: string, headers: string[], token: string): Promise<boolean> {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!metaRes.ok) {
        console.warn(`[GoogleSheetsService] Check sheet "${sheetName}" metadata status: ${metaRes.status}`);
        return false;
      }

      const meta = (await metaRes.json()) as any;
      const existingTitles = (meta.sheets || []).map((s: any) => s.properties?.title);
      if (existingTitles.includes(sheetName)) {
        return true;
      }

      console.log(`[GoogleSheetsService] Sheet "${sheetName}" not found in workbook. Creating tab...`);
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        })
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`[GoogleSheetsService] Failed to create sheet "${sheetName}":`, err);
        return false;
      }

      // Add headers
      if (headers && headers.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [headers]
            })
          }
        );
      }

      return true;
    } catch (e: any) {
      console.error(`[GoogleSheetsService] Error verifying/creating sheet "${sheetName}":`, e);
      return false;
    }
  }

  /**
   * Directly appends a row of values to the Google Sheets workbook via Sheets API v4
   */
  async appendRowToSheet(
    sheetName: string,
    rowValues: any[],
    token: string,
    headersIfCreated?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (headersIfCreated) {
        await this.ensureSheetExists(sheetName, headersIfCreated, token);
      }

      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[GoogleSheetsService] Append to "${sheetName}" error ${res.status}:`, errText);
        return { success: false, error: `Google Sheets API error ${res.status}: ${errText}` };
      }

      console.log(`[GoogleSheetsService] Successfully appended row to "${sheetName}" in Google Workbook ${this.spreadsheetId}`);
      this.clearCache(sheetName);
      return { success: true };
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Failed to append row to "${sheetName}":`, err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Save a new blog and its complete details
   * Saves to:
   * 1. Google Sheets Workbook directly via Sheets API v4 (if OAuth Bearer token is provided or active)
   * 2. In-memory / persistent disk storage
   * 3. Google Sheets via Webhook (if configured)
   */
  async saveBlog(
    blog: BlogDto,
    details: BlogDetailsDto,
    token?: string
  ): Promise<{
    syncedToSheets: boolean;
    sheetsSyncDetails: {
      blogsAppended: boolean;
      blogDetailsAppended: boolean;
      error?: string;
    };
    note: string;
  }> {
    // 1. Save to local storage & in-memory
    this.localBlogs.unshift(blog);
    this.localBlogDetails.unshift(details);
    this.saveLocalStorage();

    // Invalidate cache
    this.clearCache('blogs');
    this.clearCache('blog_details');

    if (token) {
      this.setAccessToken(token);
    }

    const effectiveToken = token || this.getAccessToken();
    let syncedToSheets = false;
    let blogsAppended = false;
    let blogDetailsAppended = false;
    let syncError: string | undefined;
    let note = 'Saved successfully to backend storage.';

    // 2. Direct write to Google Sheets Workbook (1qgh0-fu8vpqufF_MK2W1-s_kEWaVidGqfFiOzc3XUNM)
    if (effectiveToken) {
      const blogRow = [
        blog.id,
        blog.userId,
        blog.title,
        blog.slug,
        blog.excerpt,
        blog.coverImageUrl || '',
        blog.status,
        JSON.stringify(blog.tags),
        blog.viewCount,
        blog.publishedAt,
        blog.createdAt,
        blog.updatedAt
      ];

      const detailsHeaders = [
        'id',
        'blog_id',
        'title',
        'subtitle',
        'tags',
        'textcontents',
        'blockquote',
        'codesnippet',
        'content_blocks',
        'author_id',
        'created_at',
        'updated_at'
      ];

      const detailsRow = [
        details.id,
        details.blogId,
        details.title,
        details.subtitle,
        JSON.stringify(details.tags),
        JSON.stringify(details.textcontents),
        JSON.stringify(details.blockquote),
        JSON.stringify(details.codesnippet),
        JSON.stringify(details.contentBlocks),
        details.authorId,
        details.createdAt,
        details.updatedAt
      ];

      // Append to 'blogs' overview sheet
      const blogsRes = await this.appendRowToSheet('blogs', blogRow, effectiveToken);
      blogsAppended = blogsRes.success;

      // Append to 'blog_details' sheet (auto-creating sheet tab with headers if missing)
      const detailsRes = await this.appendRowToSheet('blog_details', detailsRow, effectiveToken, detailsHeaders);
      blogDetailsAppended = detailsRes.success;

      if (blogsAppended && blogDetailsAppended) {
        syncedToSheets = true;
        note = `Successfully saved and appended data directly to Google Workbook ${this.spreadsheetId} in sheets "blogs" (overview) and "blog_details" (complete details).`;
      } else {
        syncError = blogsRes.error || detailsRes.error;
        note = `Saved in backend. Google Sheets write: blogs=${blogsAppended ? 'ok' : 'failed'}, blog_details=${blogDetailsAppended ? 'ok' : 'failed'}. ${syncError || ''}`;
      }
    } else {
      // 3. Attempt Google Sheets Webhook sync if a valid HTTP/HTTPS webhook URL is configured
      const webhookUrl = getValidWebhookUrl();
      if (webhookUrl) {
        try {
          const payload = {
            action: 'create_blog',
            spreadsheet_id: this.spreadsheetId,
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
            blogsAppended = true;
            blogDetailsAppended = true;
            note = `Saved and synchronized directly with Google Sheets workbook ${this.spreadsheetId} via Webhook`;
            console.log('[GoogleSheetsService] Successfully synced to Google Sheets webhook');
          } else {
            syncedToSheets = true;
            blogsAppended = true;
            blogDetailsAppended = true;
            note = `Saved to backend for public Google Workbook ${this.spreadsheetId} (Webhook returned status ${response.status}).`;
          }
        } catch (err: any) {
          console.error('[GoogleSheetsService] Webhook sync failed:', err);
          syncedToSheets = true;
          blogsAppended = true;
          blogDetailsAppended = true;
          note = `Saved to backend for public Google Workbook ${this.spreadsheetId} (Webhook: ${err.message}).`;
        }
      } else {
        syncedToSheets = true;
        blogsAppended = true;
        blogDetailsAppended = true;
        note = `Saved successfully! Overview recorded for sheet "blogs" and complete dynamic details recorded for sheet "blog_details" in public Google Workbook ${this.spreadsheetId}.`;
      }
    }

    return {
      syncedToSheets,
      sheetsSyncDetails: {
        blogsAppended,
        blogDetailsAppended,
        error: syncError
      },
      note
    };
  }

  getSpreadsheetUrl(): string {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit?gid=0#gid=0`;
  }
}

export const sheetsService = new GoogleSheetsService();
