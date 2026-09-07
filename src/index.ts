import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { userService } from './services/userService.js';
import { blogService } from './services/blogService.js';
import { sheetsService, SPREADSHEET_ID } from './services/sheetsService.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Enable CORS for frontend applications (portfolio website, localhost, etc.)
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  })
);

app.use(express.json());

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
 * Returns paginated blogs with author information
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

/**
 * GET /blogs/:id
 * Get single blog by ID
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
      usersLoaded: userCount,
      responseTimeMs: Date.now() - startTime
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Interactive API overview and testing playground
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
      --border: #232f48;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --green: #10b981;
      --badge-bg: #1e293b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2.5rem 1rem;
    }
    .container {
      max-width: 920px;
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
      font-size: 1.05rem;
      margin-bottom: 1rem;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
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
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
    }
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
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #ffffff;
      font-size: 0.95rem;
    }
    .desc {
      color: var(--muted);
      font-size: 0.875rem;
    }
    .btn {
      background: var(--primary);
      color: #0b0f19;
      font-weight: 600;
      border: none;
      padding: 0.45rem 0.9rem;
      border-radius: 0.375rem;
      font-size: 0.825rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:hover {
      background: var(--primary-hover);
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
      max-height: 280px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">
        <span>Express.js API</span> &bull; <span>Google Sheets Database</span>
      </div>
      <h1>Portfolio Backend API</h1>
      <p class="lead">
        RESTful backend for GOPI KRISHAN S portfolio, connected directly to Google Sheets workbook as a database.
      </p>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="dot"></span>
          <span><strong>Status:</strong> Operational</span>
        </div>
        <div class="meta-item">
          <span><strong>Database:</strong> <a href="${sheetUrl}" target="_blank">Google Workbook (Edit)</a></span>
        </div>
        <div class="meta-item">
          <span><strong>Port:</strong> 3000</span>
        </div>
      </div>
    </header>

    <h2>API Endpoints</h2>
    <div class="endpoint-list">
      <!-- /users -->
      <div class="endpoint">
        <div class="endpoint-header">
          <div class="left">
            <span class="method">GET</span>
            <span class="path">/users</span>
            <span class="desc">&mdash; Matches https://apigopikrishee.runasp.net/users output</span>
          </div>
          <button class="btn" onclick="testEndpoint('/users', 'res-users')">Run Query</button>
        </div>
        <div class="result-box" id="res-users">
          <pre><code>Loading...</code></pre>
        </div>
      </div>

      <!-- /blogslist -->
      <div class="endpoint">
        <div class="endpoint-header">
          <div class="left">
            <span class="method">GET</span>
            <span class="path">/blogslist?pageNumber=1&pageSize=5</span>
            <span class="desc">&mdash; Paginated blogs from Google Sheets database</span>
          </div>
          <button class="btn" onclick="testEndpoint('/blogslist?pageNumber=1&pageSize=5', 'res-blogs')">Run Query</button>
        </div>
        <div class="result-box" id="res-blogs">
          <pre><code>Loading...</code></pre>
        </div>
      </div>

      <!-- /health -->
      <div class="endpoint">
        <div class="endpoint-header">
          <div class="left">
            <span class="method">GET</span>
            <span class="path">/health</span>
            <span class="desc">&mdash; Connection status and diagnostic telemetry</span>
          </div>
          <button class="btn" onclick="testEndpoint('/health', 'res-health')">Run Query</button>
        </div>
        <div class="result-box" id="res-health">
          <pre><code>Loading...</code></pre>
        </div>
      </div>
    </div>
  </div>

  <script>
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
