import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Turso Client
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Database Configuration:', {
  url: url ? 'Set (Hidden)' : 'Not Set',
  authToken: authToken ? 'Set (Hidden)' : 'Not Set',
  nodeEnv: process.env.NODE_ENV
});

// Create DB client only if URL is provided, otherwise null
// This prevents crashing if credentials are missing
const db = url ? createClient({
  url: url,
  authToken: authToken,
}) : null;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

// Helper to execute SQL safely
async function safeExecute(sql: string, args: any[] = []) {
  if (!db) {
    console.error('Database not configured. Skipping query:', sql);
    throw new Error('Database not configured');
  }
  return await db.execute({ sql, args });
}

// Initialize Database Schema (Async)
async function initializeDatabase() {
  if (!db) {
    console.log('Skipping database initialization: No credentials');
    return;
  }

  try {
    await safeExecute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'member',
        avatar_url TEXT
      );
    `);
    
    await safeExecute(`
      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        author_id INTEGER,
        created_at TEXT,
        status TEXT DEFAULT 'draft',
        FOREIGN KEY(author_id) REFERENCES users(id)
      );
    `);

    await safeExecute(`
      CREATE TABLE IF NOT EXISTS script_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        script_id INTEGER,
        user_id INTEGER,
        content TEXT,
        created_at TEXT,
        selected_text TEXT,
        suggestion TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY(script_id) REFERENCES scripts(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    await safeExecute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT,
        amount REAL,
        date TEXT,
        added_by INTEGER,
        FOREIGN KEY(added_by) REFERENCES users(id)
      );
    `);

    await safeExecute(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        uploaded_by INTEGER,
        created_at TEXT,
        FOREIGN KEY(uploaded_by) REFERENCES users(id)
      );
    `);

    await safeExecute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        content TEXT,
        created_at TEXT,
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );
    `);

    // Seed initial user if empty
    try {
      const userCountResult = await safeExecute('SELECT count(*) as count FROM users');
      const userCount = userCountResult.rows[0] as unknown as { count: number };
      
      if (userCount.count === 0) {
        console.log('Seeding initial users...');
        const hash = bcrypt.hashSync('password123', 10);
        await safeExecute(
          'INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)',
          ['admin', hash, 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin']
        );
        await safeExecute(
          'INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)',
          ['babu', hash, 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=babu']
        );
        console.log('Seeding completed.');
      }
    } catch (seedErr) {
      console.error('Seeding error:', seedErr);
    }

    // Migrations
    try {
      await safeExecute('ALTER TABLE script_comments ADD COLUMN selected_text TEXT');
    } catch (e) { /* Column likely exists */ }
    
    try {
      await safeExecute('ALTER TABLE script_comments ADD COLUMN suggestion TEXT');
    } catch (e) { /* Column likely exists */ }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
}

// Run initialization
initializeDatabase();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1); // Trust first proxy for secure cookies

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: db ? 'configured' : 'missing_credentials' 
  });
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await safeExecute('SELECT * FROM users WHERE username = ?', [username]);
    const user = result.rows[0] as any;
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' }); 
    res.json({ user: { id: user.id, username: user.username, role: user.role, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const result = await safeExecute('SELECT id, username, role, avatar_url FROM users WHERE id = ?', [req.user.id]);
    const user = result.rows[0];
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const result = await safeExecute(
      'INSERT INTO users (username, password_hash, avatar_url) VALUES (?, ?, ?)',
      [username, hash, avatar]
    );
    
    const userId = Number(result.lastInsertRowid);
    const user = { id: userId, username, role: 'member', avatar_url: avatar };
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await safeExecute('SELECT id, username, role, avatar_url FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, async (req: any, res) => {
  const { username, password, role, avatar_url } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const result = await safeExecute(
      'INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)',
      [username, hash, role || 'member', avatar]
    );
    
    const userId = Number(result.lastInsertRowid);
    res.json({ id: userId, username, role: role || 'member', avatar_url: avatar });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req: any, res) => {
  const { username, password, role, avatar_url } = req.body;
  const id = req.params.id;
  
  try {
    let query = 'UPDATE users SET username = ?, role = ?, avatar_url = ?';
    const params: any[] = [username, role, avatar_url];
    
    if (password && password.trim() !== '') {
      const hash = bcrypt.hashSync(password, 10);
      query += ', password_hash = ?';
      params.push(hash);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await safeExecute(query, params);
    
    const result = await safeExecute('SELECT id, username, role, avatar_url FROM users WHERE id = ?', [id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Update failed. Username might be taken.' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req: any, res) => {
  try {
    // Prevent deleting self
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await safeExecute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Scripts
app.get('/api/scripts', authenticateToken, async (req, res) => {
  try {
    const result = await safeExecute(`
      SELECT scripts.*, users.username as author_name, users.avatar_url as author_avatar 
      FROM scripts 
      JOIN users ON scripts.author_id = users.id 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

app.post('/api/scripts', authenticateToken, async (req: any, res) => {
  const { title, content } = req.body;
  const created_at = new Date().toISOString();
  try {
    const result = await safeExecute(
      'INSERT INTO scripts (title, content, author_id, created_at) VALUES (?, ?, ?, ?)',
      [title, content, req.user.id, created_at]
    );
    const scriptId = Number(result.lastInsertRowid);
    res.json({ id: scriptId, title, content, author_id: req.user.id, created_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create script' });
  }
});

app.get('/api/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const scriptResult = await safeExecute(`
        SELECT scripts.*, users.username as author_name, users.avatar_url as author_avatar 
        FROM scripts 
        JOIN users ON scripts.author_id = users.id 
        WHERE scripts.id = ?
      `,
      [req.params.id]
    );
    
    const script = scriptResult.rows[0];
    if (!script) return res.status(404).json({ error: 'Script not found' });

    const commentsResult = await safeExecute(`
        SELECT script_comments.*, users.username as author_name, users.avatar_url as author_avatar 
        FROM script_comments 
        JOIN users ON script_comments.user_id = users.id 
        WHERE script_id = ? 
        ORDER BY created_at ASC
      `,
      [req.params.id]
    );

    res.json({ ...script, comments: commentsResult.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch script details' });
  }
});

app.post('/api/scripts/:id/comments', authenticateToken, async (req: any, res) => {
  const { content, selected_text, suggestion } = req.body;
  const created_at = new Date().toISOString();
  try {
    const result = await safeExecute(
      'INSERT INTO script_comments (script_id, user_id, content, selected_text, suggestion, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, content, selected_text, suggestion, created_at]
    );
    
    const commentId = Number(result.lastInsertRowid);
    
    const commentResult = await safeExecute(`
        SELECT script_comments.*, users.username as author_name, users.avatar_url as author_avatar 
        FROM script_comments 
        JOIN users ON script_comments.user_id = users.id 
        WHERE script_comments.id = ?
      `,
      [commentId]
    );

    res.json(commentResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.post('/api/scripts/:id/publish', authenticateToken, async (req: any, res) => {
  try {
    await safeExecute(
      "UPDATE scripts SET status = 'published' WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true, status: 'published' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish script' });
  }
});

app.post('/api/scripts/:id/approve-suggestion/:commentId', authenticateToken, async (req: any, res) => {
  const { commentId } = req.params;
  
  try {
    const commentResult = await safeExecute('SELECT * FROM script_comments WHERE id = ?', [commentId]);
    const comment = commentResult.rows[0] as any;
    
    if (!comment || !comment.selected_text || !comment.suggestion) {
      return res.status(400).json({ error: 'Invalid suggestion' });
    }

    const scriptResult = await safeExecute('SELECT * FROM scripts WHERE id = ?', [req.params.id]);
    const script = scriptResult.rows[0] as any;
    
    if (!script.content.includes(comment.selected_text)) {
       return res.status(400).json({ error: 'Original text not found in script. It might have been changed already.' });
    }

    const newContent = script.content.replace(comment.selected_text, comment.suggestion);
    
    await safeExecute('UPDATE scripts SET content = ? WHERE id = ?', [newContent, req.params.id]);
    await safeExecute("UPDATE script_comments SET status = 'approved' WHERE id = ?", [commentId]);

    res.json({ success: true, newContent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
});

// Expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const result = await safeExecute(`
      SELECT expenses.*, users.username as added_by_name 
      FROM expenses 
      JOIN users ON expenses.added_by = users.id 
      ORDER BY date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', authenticateToken, async (req: any, res) => {
  const { description, amount, date } = req.body;
  try {
    const result = await safeExecute(
      'INSERT INTO expenses (description, amount, date, added_by) VALUES (?, ?, ?, ?)',
      [description, amount, date, req.user.id]
    );
    const expenseId = Number(result.lastInsertRowid);
    res.json({ id: expenseId, description, amount, date, added_by: req.user.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Videos
app.get('/api/videos', authenticateToken, async (req, res) => {
  try {
    const result = await safeExecute(`
      SELECT videos.*, users.username as uploader_name 
      FROM videos 
      JOIN users ON videos.uploaded_by = users.id 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.post('/api/videos', authenticateToken, async (req: any, res) => {
  const { title, url } = req.body;
  const created_at = new Date().toISOString();
  try {
    const result = await safeExecute(
      'INSERT INTO videos (title, url, uploaded_by, created_at) VALUES (?, ?, ?, ?)',
      [title, url, req.user.id, created_at]
    );
    const videoId = Number(result.lastInsertRowid);
    res.json({ id: videoId, title, url, uploaded_by: req.user.id, created_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add video' });
  }
});

// Messages (Chat History)
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const result = await safeExecute(`
      SELECT messages.*, users.username, users.avatar_url 
      FROM messages 
      JOIN users ON messages.sender_id = users.id 
      ORDER BY created_at ASC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Only start server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  async function startServer() {
    const PORT = 3000;

    // Vite Middleware
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Serve static files in production
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startServer();
}

export default app;
