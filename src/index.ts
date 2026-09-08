import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { userService } from './services/userService.js';
import { blogService } from './services/blogService.js';
import { sheetsService, SPREADSHEET_ID, GOOGLE_SHEETS_WEBHOOK_URL } from './services/sheetsService.js';
import { CreateBlogInput, BlogDto } from './types.js';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Enable CORS for frontend applications
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-sheets-webhook', 'x-google-access-token'],
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * GET /users
 * Returns list of users formatted identical to https://apigopikrishee.runasp.net/users
 * Powered by Google Sheets workbook as the live database
 */
app.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const users = await userService.getAllUsers(forceRefresh);
    res.setHeader('Content-Type', 'application/json');
    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id
 * Get single user by ID
 */
app.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /blogslist
 * Returns paginated blogs with author information (Overview only)
 */
app.get('/blogslist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pageNumber = parseInt(req.query.pageNumber as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const forceRefresh = req.query.refresh === 'true';
    const blogs = await blogService.getBlogsWithAuthor(pageNumber, pageSize, forceRefresh);
    res.json(blogs);
  } catch (error) {
    next(error);
  }
});

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBlogsHtml(blogs: BlogDto[], sheetUrl: string): string {
  const cards = blogs.map((b) => {
    const tagsHtml = (b.tags || [])
      .map((t: string) => `<span style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); padding:2px 8px; border-radius:9999px; font-size:0.75rem;">${escapeHtml(t)}</span>`)
      .join(' ');

    const dateStr = b.publishedAt || b.createdAt ? new Date(b.publishedAt || b.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

    return `
    <article style="background:#151c2c; border:1px solid #232f48; border-radius:0.5rem; padding:1.25rem; margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.5rem;">
        <h2 style="font-size:1.15rem; font-weight:700; color:#f1f5f9; margin:0;">
          <a href="/blogs/${escapeHtml(b.id)}/details" style="color:#f1f5f9; text-decoration:none;">${escapeHtml(b.title)}</a>
        </h2>
        <span style="font-size:0.75rem; color:#94a3b8; white-space:nowrap;">${escapeHtml(dateStr)}</span>
      </div>
      <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:0.75rem; line-height:1.5;">${escapeHtml(b.excerpt || 'Overview of blog content.')}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${tagsHtml}
        </div>
        <div style="display:flex; align-items:center; gap:12px; font-size:0.8rem; color:#64748b;">
          <span>Author: <strong style="color:#cbd5e1;">${escapeHtml(b.userName || 'Author')}</strong></span>
          <span>Views: <strong style="color:#cbd5e1;">${b.viewCount || 0}</strong></span>
          <a href="/blogs/${escapeHtml(b.id)}/details" style="color:#38bdf8; text-decoration:none; font-weight:600;">Full Details &rarr;</a>
        </div>
      </div>
    </article>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Sheets Blogs (Live Sheet "blogs")</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0b0f19;
      color: #f1f5f9;
      padding: 2rem 1rem 4rem;
      margin: 0;
      line-height: 1.6;
    }
    .container { max-width: 960px; margin: 0 auto; }
    a { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid #232f48;">
      <div>
        <div style="font-size:0.8rem; color:#38bdf8; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">
          Google Sheets Database &bull; Sheet "blogs"
        </div>
        <h1 style="font-size:1.75rem; font-weight:700; margin:0;">Live Blogs Feed (${blogs.length} Items)</h1>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="/" style="background:#1e293b; color:#f1f5f9; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:0.85rem; border:1px solid #334155;">&larr; API Dashboard</a>
        <a href="/blogs" style="background:#0284c7; color:#fff; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:0.85rem;">Raw JSON API</a>
        <a href="${sheetUrl}" target="_blank" style="background:#10b981; color:#fff; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:0.85rem;">Open Google Sheet &nearr;</a>
      </div>
    </div>
    <div>
      ${cards || '<p style="color:#94a3b8; text-align:center; padding:3rem 0;">No blogs found in Google Sheet "blogs".</p>'}
    </div>
  </div>
</body>
</html>`;
}

/**
 * GET /blogs (and /api/blogs)
 * Displays blogs from "blogs" Google Sheet data.
 * - Default: returns all blogs from the "blogs" Google Sheet
 * - Pagination (optional): ?pageNumber=1&pageSize=10
 * - Real-time cache refresh: ?refresh=true
 * - Raw Google Sheet row format: ?raw=true
 * - Standalone visual HTML rendering: ?format=html
 */
const handleGetBlogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const isRaw = req.query.raw === 'true';

    // If raw Google Sheet rows are requested
    if (isRaw) {
      const rawBlogs = await blogService.getRawBlogs(forceRefresh);
      res.json(rawBlogs);
      return;
    }

    const pageNumber = req.query.pageNumber ? parseInt(req.query.pageNumber as string, 10) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

    const blogs = await blogService.getBlogs(pageNumber, pageSize, forceRefresh);

    // If browser/client requested HTML format
    if (req.query.format === 'html') {
      const sheetUrl = sheetsService.getSpreadsheetUrl();
      res.type('html').send(renderBlogsHtml(blogs, sheetUrl));
      return;
    }

    res.json(blogs);
  } catch (error) {
    next(error);
  }
};

app.get('/blogs', handleGetBlogs);
app.get('/api/blogs', handleGetBlogs);

/**
 * GET /blogs/:id
 * Get single blog overview by ID or slug
 */
app.get('/blogs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const blog = await blogService.getBlogById(id);
    if (!blog) {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /blogs/:id/details
 * Get complete blog details with textcontents, blockquotes, and codesnippets
 */
app.get('/blogs/:id/details', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const details = await blogService.getBlogDetailsById(id);
    if (!details) {
      res.status(404).json({ message: 'Blog details not found' });
      return;
    }
    res.json(details);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /blog_details
 * Get all saved blog details from "blog_details" sheet/storage
 */
app.get('/blog_details', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const details = await blogService.getAllBlogDetails();
    res.json(details);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /blog_details/:id
 * Get specific blog details by ID
 */
app.get('/blog_details/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const details = await blogService.getBlogDetailsById(id);
    if (!details) {
      res.status(404).json({ message: 'Blog details not found' });
      return;
    }
    res.json(details);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /blogs (also supports /blog_details, /api/blogs)
 *
 * Requirements fulfilled:
 * - Accepts title, subtitle (or subtile), tags, textcontents, blockquote, codesnippet
 * - Handles any number of dynamic textcontents, blockquotes, codesnippets
 * - Saves complete details to "blog_details"
 * - Preserves "blogs" sheet containing only the overview of the content
 */
const handleCreateBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateBlogInput = req.body;

    if (!input || !input.title) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'The "title" field is required.'
      });
      return;
    }

    // Extract Google OAuth access token if provided
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const customHeaderToken = (req.headers['x-google-access-token'] as string) || undefined;
    const bodyToken = (req.body?.accessToken as string) || undefined;
    const queryToken = (req.query?.accessToken as string) || undefined;
    const accessToken = bearerToken || customHeaderToken || bodyToken || queryToken;

    // Extract Google Sheets Webhook URL if provided
    const headerWebhook = (req.headers['x-sheets-webhook-url'] as string) || undefined;
    const bodyWebhook = (req.body?.webhookUrl as string) || undefined;
    const queryWebhook = (req.query?.webhookUrl as string) || undefined;
    const webhookUrl = headerWebhook || bodyWebhook || queryWebhook;

    const result = await blogService.createBlog(input, accessToken, webhookUrl);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Create Blog Error]', error);
    res.status(500).json({
      error: 'Failed to create blog',
      message: error.message || 'An unexpected error occurred.'
    });
  }
};

app.post('/blogs', handleCreateBlog);
app.post('/blog_details', handleCreateBlog);
app.post('/api/blogs', handleCreateBlog);

/**
 * POST /api/auth/token
 * Register active Google OAuth token for Google Sheets API operations
 */
app.post('/api/auth/token', (req: Request, res: Response) => {
  const { accessToken } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') {
    res.status(400).json({ error: 'accessToken is required and must be a string' });
    return;
  }
  sheetsService.setAccessToken(accessToken);
  res.json({
    status: 'ok',
    message: 'Google Sheets OAuth access token registered for active session',
    spreadsheetId: sheetsService.getSpreadsheetId()
  });
});

/**
 * GET /api/auth/status
 * Check if the backend has an active Google OAuth token
 */
app.get('/api/auth/status', (req: Request, res: Response) => {
  const hasToken = Boolean(sheetsService.getAccessToken());
  res.json({
    hasActiveGoogleToken: hasToken,
    spreadsheetId: sheetsService.getSpreadsheetId(),
    spreadsheetUrl: sheetsService.getSpreadsheetUrl()
  });
});

/**
 * GET /api/firebase-config
 * Serve client Firebase config for seamless Google Auth popup
 */
app.get('/api/firebase-config', (req: Request, res: Response) => {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
      return;
    }
  } catch (e) {
    console.warn('Could not read firebase-applet-config.json', e);
  }
  res.json({
    projectId: process.env.FIREBASE_PROJECT_ID || 'myprofile-2026'
  });
});

/**
 * GET /health
 * System health check & Google Sheets connection test
 */
app.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let sheetsStatus = 'connected';
  let userCount = 0;
  try {
    const users = await userService.getAllUsers(false);
    userCount = users.length;
  } catch {
    sheetsStatus = 'degraded';
  }

  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      type: 'Google Sheets Workbook',
      spreadsheetId: SPREADSHEET_ID,
      status: sheetsStatus,
      sheets: {
        blogs: 'Overview of contents (preserved)',
        blog_details: 'Complete input details (dynamic blocks)'
      },
      hasActiveGoogleOAuthToken: Boolean(sheetsService.getAccessToken()),
      webhookConfigured: Boolean(GOOGLE_SHEETS_WEBHOOK_URL),
      usersLoaded: userCount,
      responseTimeMs: Date.now() - startTime
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Interactive API overview and dynamic testing playground
 */
app.get('/', (req: Request, res: Response) => {
  const sheetUrl = sheetsService.getSpreadsheetUrl();
  res.type('html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Backend API (Google Sheets Database)</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #151c2c;
      --card-hover: #1b2438;
      --border: #232f48;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --green: #10b981;
      --purple: #a855f7;
      --badge-bg: #1e293b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem 4rem;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.12);
      color: var(--primary);
      margin-bottom: 0.75rem;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .lead {
      color: var(--muted);
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.85rem;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { text-decoration: underline; }

    /* Section layout */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin: 2rem 0 1.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: all 0.15s;
    }
    .tab-btn.active {
      color: var(--primary);
      background: rgba(56, 189, 248, 0.1);
    }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    /* Post Creator Card */
    .form-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: #e2e8f0;
    }
    .form-control {
      width: 100%;
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      color: #f1f5f9;
      padding: 0.6rem 0.85rem;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-control:focus {
      border-color: var(--primary);
    }

    /* Dynamic Content Blocks */
    .blocks-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }
    .block-card {
      background: #0d121f;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      position: relative;
    }
    .block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .block-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      letter-spacing: 0.05em;
    }
    .block-tag.text { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .block-tag.blockquote { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .block-tag.codesnippet { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .btn-remove {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .btn-remove:hover { text-decoration: underline; }

    .block-toolbar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border);
      border-radius: 0.5rem;
      align-items: center;
    }
    .btn-add {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid var(--border);
      padding: 0.45rem 0.85rem;
      border-radius: 0.375rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-add:hover {
      background: #283548;
      border-color: var(--primary);
    }
    .btn-primary {
      background: var(--primary);
      color: #0b0f19;
      border: none;
      padding: 0.65rem 1.5rem;
      border-radius: 0.375rem;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }

    /* Endpoints list */
    .endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .endpoint {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      gap: 1rem;
    }
    .left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .method {
      padding: 0.25rem 0.6rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .method.get {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .method.post {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #ffffff;
      font-size: 0.95rem;
    }
    .desc {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .btn {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid var(--border);
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 0.375rem;
      font-size: 0.825rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:hover {
      background: var(--primary);
      color: #0b0f19;
      border-color: var(--primary);
    }
    .result-box {
      border-top: 1px solid var(--border);
      padding: 1rem 1.25rem;
      display: none;
      background: #090d16;
    }
    .result-box.open { display: block; }
    pre {
      background: transparent;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.825rem;
      color: #cbd5e1;
      max-height: 350px;
    }
    /* Google Material Button */
    .gsi-material-button {
      background-color: #ffffff;
      border: 1px solid #747775;
      border-radius: 20px;
      box-sizing: border-box;
      color: #1f1f1f;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      height: 40px;
      letter-spacing: 0.25px;
      outline: none;
      padding: 0 16px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      transition: background-color .2s, box-shadow .2s;
    }
    .gsi-material-button:hover {
      background-color: #f8fafc;
      box-shadow: 0 1px 3px 0 rgba(60, 64, 67, .30), 0 4px 8px 3px rgba(60, 64, 67, .15);
    }
    .auth-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .auth-card-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid var(--primary);
    }
    .user-info h4 {
      font-size: 0.95rem;
      color: #f8fafc;
      font-weight: 600;
    }
    .user-info p {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .sync-status-box {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      display: none;
    }
    .sync-status-box.success {
      display: block;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .sync-status-box.warning {
      display: block;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fcd34d;
    }
    .sync-status-box.error {
      display: block;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .callout {
      background: rgba(56, 189, 248, 0.08);
      border-left: 3px solid var(--primary);
      padding: 1rem;
      border-radius: 0 0.375rem 0.375rem 0;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .callout strong { color: var(--primary); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">
        <span>Express.js API</span> &bull; <span>Google Sheets Database</span>
      </div>
      <h1>Portfolio & Blog Content Backend</h1>
      <p class="lead">
        API connected to Google Workbook. Overview preserved in <code>blogs</code>; complete dynamic details saved to <code>blog_details</code>.
      </p>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="dot"></span>
          <span><strong>Status:</strong> Operational</span>
        </div>
        <div class="meta-item">
          <span><strong>Database:</strong> <a href="${sheetUrl}" target="_blank">Google Workbook (Open)</a></span>
        </div>
        <div class="meta-item">
          <span><strong>Sheet "blogs":</strong> Overview Only</span>
        </div>
        <div class="meta-item">
          <span><strong>Sheet "blog_details":</strong> Complete Dynamic Inputs</span>
        </div>
      </div>
    </header>

    <div class="tabs">
      <button class="tab-btn active" data-tab="tab-create" onclick="switchTab('tab-create')">Create Blog (POST API Tester)</button>
      <button class="tab-btn" data-tab="tab-sheet-blogs" onclick="switchTab('tab-sheet-blogs')">Google Sheet Blogs (GET /blogs)</button>
      <button class="tab-btn" data-tab="tab-endpoints" onclick="switchTab('tab-endpoints')">API Endpoints (GET / POST)</button>
      <button class="tab-btn" data-tab="tab-sheet-guide" onclick="switchTab('tab-sheet-guide')">Google Sheets Architecture</button>
    </div>

    <!-- TAB 1: Dynamic Blog Creator -->
    <div id="tab-create" class="tab-pane active">
      <!-- Public Workbook Status Banner -->
      <div class="auth-card" style="border-left: 3px solid #10b981;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.35rem;">
              <span class="auth-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">
                <span class="dot" style="background: #10b981;"></span>
                Public Edit Access &bull; No Sign-in Required
              </span>
              <span class="badge" style="margin-bottom: 0;">Secret Key Configured</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--muted);">
              Target Google Workbook: <code>${SPREADSHEET_ID}</code> (loaded from environment secret key <code>GOOGLE_SPREADSHEET_ID</code>). The API is fully accessible without requiring any sign-in.
            </p>
          </div>
          <div>
            <a href="${sheetUrl}" target="_blank" class="btn" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
              Open Google Workbook &nearr;
            </a>
          </div>
        </div>
      </div>

      <div class="callout">
        <strong>Dynamic Content Blocks:</strong> Add any number of <em>textcontents</em>, <em>blockquotes</em>, and <em>codesnippets</em> below. When submitted, the backend saves the overview into <strong>"blogs"</strong> and full details into <strong>"blog_details"</strong>.
      </div>

      <div class="form-card">
        <form id="blogForm" onsubmit="submitBlog(event)">
          <div class="form-group">
            <label class="form-label" for="title">Blog Title *</label>
            <input type="text" id="title" class="form-control" placeholder="e.g., Architecting Resilient Cloud Systems with C# & Express" required value="Building High-Performance APIs with Clean Architecture">
          </div>

          <div class="form-group">
            <label class="form-label" for="subtitle">Subtitle / Subtile (Overview Summary)</label>
            <input type="text" id="subtitle" class="form-control" placeholder="e.g., A deep dive into scalable database layers..." value="Comprehensive guide on decoupling services and scaling data layers effectively.">
          </div>

          <div class="form-group">
            <label class="form-label" for="tags">Tags (Comma-separated)</label>
            <input type="text" id="tags" class="form-control" placeholder="tech, dotnet, express, cloud" value="dotnet, express, architecture, cloud">
          </div>

          <label class="form-label">Dynamic Content Details (Text, Quotes, Code Snippets)</label>
          <div class="block-toolbar">
            <span style="font-size: 0.8rem; color: var(--muted); margin-right: 0.5rem;">Add Block:</span>
            <button type="button" class="btn-add" onclick="addContentBlock('text')">+ Add Text Content</button>
            <button type="button" class="btn-add" onclick="addContentBlock('blockquote')">+ Add Blockquote</button>
            <button type="button" class="btn-add" onclick="addContentBlock('codesnippet')">+ Add Code Snippet</button>
          </div>

          <div id="blocksContainer" class="blocks-container">
            <!-- Default dynamic blocks populated initially -->
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 0.375rem; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
            <input type="checkbox" id="confirmWriteToSheets" checked style="accent-color: var(--primary); width: 18px; height: 18px; cursor: pointer;">
            <label for="confirmWriteToSheets" style="font-size: 0.85rem; color: #e2e8f0; cursor: pointer;">
              Save to Google Workbook <strong>${SPREADSHEET_ID}</strong> (Overview &rarr; <code>blogs</code>, Complete Details &rarr; <code>blog_details</code>)
            </label>
          </div>

          <button type="submit" class="btn-primary" id="submitBtn">Publish & Save to Backend</button>
        </form>

        <div id="syncFeedbackBox" class="sync-status-box"></div>

        <div id="submitResult" class="result-box" style="margin-top: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border);">
          <pre><code id="submitCode">Waiting for submission...</code></pre>
        </div>
      </div>
    </div>

    <!-- TAB: Google Sheet Blogs (Live Feed) -->
    <div id="tab-sheet-blogs" class="tab-pane">
      <div class="auth-card" style="border-left: 3px solid #38bdf8; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.35rem;">
              <span class="auth-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
                <span class="dot" style="background: #38bdf8;"></span>
                Live Google Sheet "blogs"
              </span>
              <span class="badge" id="sheetBlogsCountBadge" style="margin-bottom: 0;">Loading blogs...</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--muted);">
              Data fetched live via <code>GET /blogs</code> from Google Sheets tab <strong>"blogs"</strong> (Spreadsheet ID: <code>${SPREADSHEET_ID}</code>).
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn" onclick="loadSheetBlogs(true)" style="background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; font-weight: 600;">
              &orarr; Refresh from Sheet
            </button>
            <a href="/blogs" target="_blank" class="btn" style="text-decoration: none;">
              Raw JSON (/blogs) &nearr;
            </a>
            <a href="/blogs?format=html" target="_blank" class="btn" style="text-decoration: none;">
              HTML View (/blogs?format=html) &nearr;
            </a>
          </div>
        </div>
      </div>

      <div id="sheetBlogsList">
        <div style="text-align: center; padding: 3rem 1rem; color: var(--muted); background: var(--card); border-radius: 0.5rem; border: 1px solid var(--border);">
          Loading blogs from Google Sheet "blogs"...
        </div>
      </div>
    </div>

    <!-- TAB 2: Endpoints -->
    <div id="tab-endpoints" class="tab-pane">
      <div class="endpoint-list">
        <!-- GET /blogs -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method get">GET</span>
              <span class="path">/blogs</span>
              <span class="desc">&mdash; Displays all blogs from "blogs" Google Sheet data (supports ?refresh=true, ?raw=true, ?pageNumber=1&amp;pageSize=10, ?format=html)</span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn" onclick="testEndpoint('/blogs', 'res-blogs-main')">Run Query</button>
              <a href="/blogs" target="_blank" class="btn" style="text-decoration: none; display: inline-flex; align-items: center;">Raw JSON &nearr;</a>
              <a href="/blogs?format=html" target="_blank" class="btn" style="text-decoration: none; display: inline-flex; align-items: center;">HTML View &nearr;</a>
            </div>
          </div>
          <div class="result-box" id="res-blogs-main">
            <pre><code>Loading...</code></pre>
          </div>
        </div>

        <!-- POST /blogs -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method post">POST</span>
              <span class="path">/blogs</span>
              <span class="desc">&mdash; Create blog: stores overview in "blogs" &amp; details in "blog_details"</span>
            </div>
            <button class="btn" onclick="switchTab('tab-create')">Try in Form</button>
          </div>
        </div>

        <!-- GET /users -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method get">GET</span>
              <span class="path">/users</span>
              <span class="desc">&mdash; Matches https://apigopikrishee.runasp.net/users output</span>
            </div>
            <button class="btn" onclick="testEndpoint('/users', 'res-users')">Run Query</button>
          </div>
          <div class="result-box" id="res-users">
            <pre><code>Loading...</code></pre>
          </div>
        </div>

        <!-- GET /blogslist -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method get">GET</span>
              <span class="path">/blogslist?pageNumber=1&pageSize=5</span>
              <span class="desc">&mdash; Paginated blog list (Overview only)</span>
            </div>
            <button class="btn" onclick="testEndpoint('/blogslist?pageNumber=1&pageSize=5', 'res-blogs')">Run Query</button>
          </div>
          <div class="result-box" id="res-blogs">
            <pre><code>Loading...</code></pre>
          </div>
        </div>

        <!-- GET /blog_details -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method get">GET</span>
              <span class="path">/blog_details</span>
              <span class="desc">&mdash; Complete details with all textcontents, blockquotes, codesnippets</span>
            </div>
            <button class="btn" onclick="testEndpoint('/blog_details', 'res-details')">Run Query</button>
          </div>
          <div class="result-box" id="res-details">
            <pre><code>Loading...</code></pre>
          </div>
        </div>

        <!-- GET /health -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="left">
              <span class="method get">GET</span>
              <span class="path">/health</span>
              <span class="desc">&mdash; Diagnostic telemetry and spreadsheet connection</span>
            </div>
            <button class="btn" onclick="testEndpoint('/health', 'res-health')">Run Query</button>
          </div>
          <div class="result-box" id="res-health">
            <pre><code>Loading...</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Architecture Guide -->
    <div id="tab-sheet-guide" class="tab-pane">
      <!-- Live Sync Setup Callout -->
      <div class="form-card" style="margin-bottom: 1.5rem; border-left: 3px solid #f59e0b;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem;">
          <span style="font-weight: 700; color: #fbbf24; font-size: 1.05rem;">Direct Google Sheets Sync & Auto-Creating "blog_details"</span>
        </div>
        <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          <strong>Why does Google Sheets require a webhook or sign-in?</strong><br/>
          Even when a Google Sheet is shared with public <em>"Anyone with the link can edit"</em> permissions, Google's official REST API (<code>sheets.googleapis.com</code>) strictly blocks anonymous POST requests (<code style="color:#f87171;">401 UNAUTHENTICATED</code>). The public edit link allows humans in a web browser to edit, but programmatic backend writes require either:
        </p>
        <ol style="margin-left: 1.25rem; color: #94a3b8; font-size: 0.88rem; line-height: 1.6; margin-bottom: 1rem;">
          <li><strong style="color: #38bdf8;">Google Apps Script Web App (Zero sign-in required):</strong> Deploy a 25-line script inside your sheet that auto-creates the <code>blog_details</code> tab and appends to both sheets.</li>
          <li><strong style="color: #c084fc;">Google OAuth Token:</strong> Pass an authorized Google Bearer token in the <code>Authorization: Bearer &lt;token&gt;</code> request header.</li>
        </ol>

        <h4 style="color: #fbbf24; margin-top: 1.25rem; margin-bottom: 0.5rem;">1-Minute Setup: Google Apps Script Webhook</h4>
        <p style="color: #cbd5e1; font-size: 0.88rem; margin-bottom: 0.75rem;">
          Follow these 3 quick steps in your Google Workbook (<code>${SPREADSHEET_ID}</code>):
        </p>
        <ol style="margin-left: 1.25rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.6; margin-bottom: 1rem;">
          <li>In your Google Sheet, open menu: <strong>Extensions &rarr; Apps Script</strong>.</li>
          <li>Delete any code in the editor, paste the script below, and click <strong>Save</strong>.</li>
          <li>Click <strong>Deploy &rarr; New deployment</strong>, select type: <strong>Web app</strong>, configure:
            <ul style="margin-left: 1rem; margin-top: 4px; color: #94a3b8;">
              <li>Execute as: <strong>Me</strong></li>
              <li>Who has access: <strong>Anyone</strong> (this allows your backend to write without user login)</li>
            </ul>
          </li>
          <li>Copy the <strong>Web app URL</strong> and set it in your environment settings as <code>GOOGLE_SHEETS_WEBHOOK_URL</code>.</li>
        </ol>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.8rem; font-weight: 600; color: #94a3b8;">Google Apps Script (Code.gs):</span>
          <button type="button" class="btn" style="font-size: 0.75rem; padding: 4px 10px;" onclick="copyAppsScriptCode()">Copy Script to Clipboard</button>
        </div>
        <pre id="appsScriptCode" style="background: #090d16; padding: 1rem; border-radius: 0.375rem; font-size: 0.8rem; overflow-x: auto; color: #a5b4fc; max-height: 320px;"><code>function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Ensure sheet "blogs" exists and append
    var blogsSheet = ss.getSheetByName("blogs");
    if (!blogsSheet) {
      blogsSheet = ss.insertSheet("blogs");
      blogsSheet.appendRow([
        "id", "author_id", "title", "slug", "excerpt",
        "cover_image_url", "status", "tags", "view_count",
        "published_at", "created_at", "updated_at"
      ]);
    }
    var b = data.blog_overview;
    blogsSheet.appendRow([
      b.id,
      b.author_id,
      b.title,
      b.slug,
      b.excerpt,
      b.cover_image_url || "",
      b.status,
      JSON.stringify(b.tags),
      b.view_count || 0,
      b.published_at,
      b.created_at,
      b.updated_at
    ]);

    // 2. Ensure sheet "blog_details" exists and append
    var detailsSheet = ss.getSheetByName("blog_details");
    if (!detailsSheet) {
      detailsSheet = ss.insertSheet("blog_details");
      detailsSheet.appendRow([
        "id", "blog_id", "title", "subtitle", "tags",
        "textcontents", "blockquote", "codesnippet",
        "content_blocks", "author_id", "created_at", "updated_at"
      ]);
    }
    var d = data.blog_details;
    detailsSheet.appendRow([
      d.id,
      d.blog_id,
      d.title,
      d.subtitle || "",
      JSON.stringify(d.tags),
      JSON.stringify(d.textcontents),
      JSON.stringify(d.blockquote),
      JSON.stringify(d.codesnippet),
      JSON.stringify(d.content_blocks),
      d.author_id,
      d.created_at,
      d.updated_at
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Successfully recorded in blogs and blog_details"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}</code></pre>
      </div>

      <div class="form-card">
        <h3 style="margin-bottom: 0.75rem; font-size: 1.15rem;">Two-Tier Google Sheets Schema Design</h3>
        <p style="color: var(--muted); margin-bottom: 1.25rem;">
          To ensure high performance and strict backward compatibility, the API maintains two distinct representations:
        </p>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #38bdf8; margin-bottom: 0.5rem;">1. Sheet: <code>blogs</code> (Overview Only)</h4>
          <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 0.5rem;">
            Preserves original schema so list endpoints, pagination, and external consumers remain completely uninterrupted.
          </p>
          <pre style="background: #090d16; padding: 0.75rem; border-radius: 0.375rem;"><code>id, author_id, title, slug, excerpt, cover_image_url, status, tags, view_count, published_at, created_at, updated_at</code></pre>
        </div>

        <div>
          <h4 style="color: #c084fc; margin-bottom: 0.5rem;">2. Sheet: <code>blog_details</code> (Complete Input Details)</h4>
          <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 0.5rem;">
            Stores the complete rich content, including variable numbers of text paragraphs, quotes, code snippets, and ordered blocks.
          </p>
          <pre style="background: #090d16; padding: 0.75rem; border-radius: 0.375rem;"><code>id, blog_id, title, subtitle, tags, textcontents, blockquote, codesnippet, content_blocks, author_id, created_at, updated_at</code></pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('data-tab') === tabId || (b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId))) {
          b.classList.add('active');
        }
      });
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');

      if (tabId === 'tab-sheet-blogs' && !blogsLoadedOnce) {
        loadSheetBlogs();
      }
    }

    let blogsLoadedOnce = false;

    async function loadSheetBlogs(forceRefresh = false) {
      const container = document.getElementById('sheetBlogsList');
      const countBadge = document.getElementById('sheetBlogsCountBadge');
      if (forceRefresh) {
        countBadge.textContent = 'Refreshing...';
        container.innerHTML = '<div style="text-align: center; padding: 2.5rem; color: var(--muted);">Fetching live rows directly from Google Sheet "blogs"...</div>';
      }
      try {
        const url = forceRefresh ? '/blogs?refresh=true' : '/blogs';
        const res = await fetch(url);
        const blogs = await res.json();
        blogsLoadedOnce = true;

        if (!Array.isArray(blogs)) {
          throw new Error(blogs.message || 'Unexpected response format');
        }

        countBadge.textContent = blogs.length + ' Blogs Loaded';

        if (blogs.length === 0) {
          container.innerHTML = '<div style="text-align: center; padding: 2.5rem; color: var(--muted); background: var(--card); border-radius: 0.5rem; border: 1px solid var(--border);">No blogs found in Google Sheet "blogs".</div>';
          return;
        }

        container.innerHTML = blogs.map(b => {
          const tags = (b.tags || []).map(t => '<span class="badge" style="margin: 0; font-size: 0.7rem; padding: 2px 8px; background: rgba(56,189,248,0.12); color: var(--primary); border: 1px solid rgba(56,189,248,0.25);">' + (t || '') + '</span>').join(' ');
          const dateStr = b.publishedAt || b.createdAt ? new Date(b.publishedAt || b.createdAt).toLocaleDateString() : '';
          return '<div class="endpoint" style="margin-bottom: 1rem; padding: 1.25rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.5rem;">' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">' +
              '<h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text); margin: 0;">' + (b.title || 'Untitled') + '</h3>' +
              '<span style="font-size: 0.75rem; color: var(--muted); white-space: nowrap;">' + dateStr + '</span>' +
            '</div>' +
            '<p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.85rem; line-height: 1.5;">' + (b.excerpt || 'Overview of blog content.') + '</p>' +
            '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">' +
              '<div style="display: flex; gap: 6px; flex-wrap: wrap;">' + tags + '</div>' +
              '<div style="display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--muted);">' +
                '<span>Author: <strong style="color: var(--text);">' + (b.userName || 'Author') + '</strong></span>' +
                '<span>Views: <strong style="color: var(--text);">' + (b.viewCount || 0) + '</strong></span>' +
                '<a href="/blogs/' + encodeURIComponent(b.id) + '/details" target="_blank" class="btn" style="padding: 3px 8px; font-size: 0.75rem; text-decoration: none;">View Details &nearr;</a>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch (err) {
        countBadge.textContent = 'Error loading';
        container.innerHTML = '<div style="color: var(--danger); padding: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: 0.5rem;"><strong>Failed to load blogs:</strong> ' + err.message + '</div>';
      }
    }

    function goToSheetGuide() {
      switchTab('tab-sheet-guide');
    }

    let blockCounter = 0;

    function addContentBlock(type, initialContent = '') {
      blockCounter++;
      const id = 'block_' + blockCounter;
      const container = document.getElementById('blocksContainer');

      const card = document.createElement('div');
      card.className = 'block-card';
      card.id = id;

      let typeLabel = 'Text Content';
      let tagClass = 'text';
      let placeholder = 'Enter paragraph text...';

      if (type === 'blockquote') {
        typeLabel = 'Blockquote';
        tagClass = 'blockquote';
        placeholder = 'Enter a notable quote or highlight...';
      } else if (type === 'codesnippet') {
        typeLabel = 'Code Snippet';
        tagClass = 'codesnippet';
        placeholder = '// Write or paste code snippet here...\\nfunction example() {\\n  return true;\\n}';
      }

      card.innerHTML = \`
        <div class="block-header">
          <span class="block-tag \${tagClass}">\${typeLabel}</span>
          <button type="button" class="btn-remove" onclick="removeBlock('\${id}')">&times; Remove</button>
        </div>
        <textarea class="form-control" rows="\${type === 'codesnippet' ? '4' : '3'}" data-type="\${type}" placeholder="\${placeholder}" style="font-family: \${type === 'codesnippet' ? 'monospace' : 'inherit'}">\${initialContent}</textarea>
      \`;

      container.appendChild(card);
    }

    function removeBlock(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    // Populate initial sample blocks for dynamic demonstration
    addContentBlock('text', 'In modern enterprise software development, clean architecture provides high modularity and separation of concerns.');
    addContentBlock('blockquote', '"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra');
    addContentBlock('codesnippet', 'export async function getBlogs() {\\n  const res = await fetch("/blogslist");\\n  return res.json();\\n}');

    async function submitBlog(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving to Backend & Sheets...';

      const title = document.getElementById('title').value;
      const subtitle = document.getElementById('subtitle').value;
      const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);

      const textcontents = [];
      const blockquote = [];
      const codesnippet = [];
      const contentBlocks = [];

      const blockCards = document.querySelectorAll('#blocksContainer .block-card');
      blockCards.forEach((card, index) => {
        const textarea = card.querySelector('textarea');
        const type = textarea.getAttribute('data-type');
        const content = textarea.value.trim();

        if (content) {
          contentBlocks.push({ type, content, order: index });
          if (type === 'text') textcontents.push(content);
          else if (type === 'blockquote') blockquote.push(content);
          else if (type === 'codesnippet') codesnippet.push(content);
        }
      });

      const payload = {
        title,
        subtitle,
        tags,
        textcontents,
        blockquote,
        codesnippet,
        contentBlocks
      };

      const resultBox = document.getElementById('submitResult');
      const submitCode = document.getElementById('submitCode');
      const feedbackBox = document.getElementById('syncFeedbackBox');
      feedbackBox.style.display = 'none';
      resultBox.classList.add('open');
      submitCode.textContent = 'Sending POST /blogs with dynamic content payload:\\n' + JSON.stringify(payload, null, 2);

      try {
        const res = await fetch('/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        submitCode.textContent = 'Status ' + res.status + '\\n\\n' + JSON.stringify(data, null, 2);

        if (data.googleSheetsSync && data.googleSheetsSync.syncedToGoogleSheets) {
          feedbackBox.className = 'sync-status-box success';
          feedbackBox.style.display = 'block';
          feedbackBox.innerHTML = '<strong>Successfully Appended to Google Workbook!</strong><br/>' +
            '<div style="margin-top:4px;">&bull; Overview appended to sheet: <strong>blogs</strong><br/>' +
            '&bull; Complete dynamic inputs appended to sheet: <strong>blog_details</strong></div>' +
            '<a href="${sheetUrl}" target="_blank" style="display:inline-block; margin-top:8px; font-weight:600; color:#38bdf8;">Open Google Workbook (${SPREADSHEET_ID}) &rarr;</a>';
        } else {
          feedbackBox.className = 'sync-status-box warning';
          feedbackBox.style.display = 'block';
          feedbackBox.innerHTML = '<strong>Saved in Backend API &bull; Google Sheets Direct Sync Pending</strong><br/>' +
            '<div style="font-size:0.85rem; color:#fde68a; margin: 6px 0;">' + (data.googleSheetsSync?.syncNote || 'Google REST API requires authorization or an Apps Script Webhook for programmatic writes.') + '</div>' +
            '<div style="margin-top:8px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
            '<button type="button" class="btn" onclick="goToSheetGuide()" style="font-size:0.75rem; padding:4px 10px; background:#f59e0b; color:#18181b; font-weight:600;">View 1-Minute Apps Script Setup Guide &rarr;</button>' +
            '<a href="${sheetUrl}" target="_blank" style="font-size:0.8rem; font-weight:600; color:#38bdf8;">Open Google Workbook &nearr;</a>' +
            '</div>';
        }
      } catch (err) {
        submitCode.textContent = 'Error: ' + err.message;
        feedbackBox.className = 'sync-status-box error';
        feedbackBox.style.display = 'block';
        feedbackBox.innerHTML = '<strong>Error saving blog:</strong> ' + err.message;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish & Save to Backend';
      }
    }

    function copyAppsScriptCode() {
      const code = document.getElementById('appsScriptCode').innerText;
      navigator.clipboard.writeText(code).then(() => {
        alert('Apps Script code copied to clipboard! Paste it into Extensions > Apps Script in your Google Sheet.');
      }).catch(() => {
        prompt('Copy this Apps Script code:', code);
      });
    }

    async function testEndpoint(url, targetId) {
      const box = document.getElementById(targetId);
      box.classList.add('open');
      const code = box.querySelector('code');
      code.textContent = 'Querying ' + url + '...';
      try {
        const res = await fetch(url);
        const data = await res.json();
        code.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        code.textContent = 'Error: ' + err.message;
      }
    }
  </script>
</body>
</html>
  `);
});

// Generic 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Unknown error occurred'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[Portfolio Backend] Express server running on http://${HOST}:${PORT}`);
  console.log(`[Portfolio Backend] Connected to Google Sheets database: ${SPREADSHEET_ID}`);
});
