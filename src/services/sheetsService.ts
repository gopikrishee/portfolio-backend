import { RawUserRow, RawBlogRow } from '../types.js';

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1qgh0-fu8vpqufF_MK2W1-s_kEWaVidGqfFiOzc3XUNM';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class GoogleSheetsService {
  private spreadsheetId: string;
  private cache = new Map<string, CacheEntry<any>>();
  private cacheTtlMs = 30000; // 30 seconds cache

  constructor(spreadsheetId: string = SPREADSHEET_ID) {
    this.spreadsheetId = spreadsheetId;
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
    } catch (error) {
      console.error(`[GoogleSheetsService] Error fetching sheet "${sheetName}":`, error);

      // Return stale cache if available
      if (cached) {
        console.warn(`[GoogleSheetsService] Returning stale cached data for "${sheetName}"`);
        return cached.data;
      }

      throw error;
    }
  }

  /**
   * Get raw user rows from the "users" sheet
   */
  async getUsers(forceRefresh: boolean = false): Promise<RawUserRow[]> {
    return this.fetchSheetRows<RawUserRow>('users', forceRefresh);
  }

  /**
   * Get raw blog rows from the "blogs" sheet
   */
  async getBlogs(forceRefresh: boolean = false): Promise<RawBlogRow[]> {
    return this.fetchSheetRows<RawBlogRow>('blogs', forceRefresh);
  }

  getSpreadsheetUrl(): string {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit?gid=0#gid=0`;
  }
}

export const sheetsService = new GoogleSheetsService();
