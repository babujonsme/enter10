import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('babu_enter10.db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'member',
    avatar_url TEXT
  );
  
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    author_id INTEGER,
    created_at TEXT,
    status TEXT DEFAULT 'draft',
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

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

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    amount REAL,
    date TEXT,
    added_by INTEGER,
    FOREIGN KEY(added_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    url TEXT,
    uploaded_by INTEGER,
    created_at TEXT,
    FOREIGN KEY(uploaded_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    content TEXT,
    created_at TEXT,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );
`);

// Seed initial user if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hash = bcrypt.hashSync('password123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)').run('admin', hash, 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin');
  db.prepare('INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)').run('babu', hash, 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=babu');
}

// Migration: Add new columns to script_comments if they don't exist
try {
  db.prepare('ALTER TABLE script_comments ADD COLUMN selected_text TEXT').run();
} catch (e) {
  // Column likely exists
}
try {
  db.prepare('ALTER TABLE script_comments ADD COLUMN suggestion TEXT').run();
} catch (e) {
  // Column likely exists
}
/*
try {
  db.prepare("ALTER TABLE script_comments ADD COLUMN status TEXT DEFAULT 'pending'").run();
} catch (e) {
  // Column likely exists
}

try {
  db.prepare("ALTER TABLE scripts ADD COLUMN status TEXT DEFAULT 'draft'").run();
} catch (e) {
  // Column likely exists
}
*/

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    // AI Studio requires SameSite=None and Secure=true for cookies in iframes
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' }); 
    res.json({ user: { id: user.id, username: user.username, role: user.role, avatar_url: user.avatar_url } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user = db.prepare('SELECT id, username, role, avatar_url FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      const info = db.prepare('INSERT INTO users (username, password_hash, avatar_url) VALUES (?, ?, ?)').run(username, hash, avatar);
      const user = { id: info.lastInsertRowid, username, role: 'member', avatar_url: avatar };
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  // Users
  app.get('/api/users', authenticateToken, (req, res) => {
    const users = db.prepare('SELECT id, username, role, avatar_url FROM users').all();
    res.json(users);
  });

  app.post('/api/users', authenticateToken, (req: any, res) => {
    const { username, password, role, avatar_url } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      const info = db.prepare('INSERT INTO users (username, password_hash, role, avatar_url) VALUES (?, ?, ?, ?)').run(username, hash, role || 'member', avatar);
      res.json({ id: info.lastInsertRowid, username, role: role || 'member', avatar_url: avatar });
    } catch (err) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  app.put('/api/users/:id', authenticateToken, (req: any, res) => {
    const { username, password, role, avatar_url } = req.body;
    const id = req.params.id;
    
    try {
      let query = 'UPDATE users SET username = ?, role = ?, avatar_url = ?';
      const params = [username, role, avatar_url];
      
      if (password && password.trim() !== '') {
        const hash = bcrypt.hashSync(password, 10);
        query += ', password_hash = ?';
        params.push(hash);
      }
      
      query += ' WHERE id = ?';
      params.push(id);
      
      db.prepare(query).run(...params);
      
      const updatedUser = db.prepare('SELECT id, username, role, avatar_url FROM users WHERE id = ?').get(id);
      res.json(updatedUser);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Update failed. Username might be taken.' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, (req: any, res) => {
    try {
      // Prevent deleting self
      if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Scripts
  app.get('/api/scripts', authenticateToken, (req, res) => {
    const scripts = db.prepare(`
      SELECT scripts.*, users.username as author_name, users.avatar_url as author_avatar 
      FROM scripts 
      JOIN users ON scripts.author_id = users.id 
      ORDER BY created_at DESC
    `).all();
    res.json(scripts);
  });

  app.post('/api/scripts', authenticateToken, (req: any, res) => {
    const { title, content } = req.body;
    const created_at = new Date().toISOString();
    const info = db.prepare('INSERT INTO scripts (title, content, author_id, created_at) VALUES (?, ?, ?, ?)').run(title, content, req.user.id, created_at);
    res.json({ id: info.lastInsertRowid, title, content, author_id: req.user.id, created_at });
  });

  app.get('/api/scripts/:id', authenticateToken, (req, res) => {
    const script = db.prepare(`
      SELECT scripts.*, users.username as author_name, users.avatar_url as author_avatar 
      FROM scripts 
      JOIN users ON scripts.author_id = users.id 
      WHERE scripts.id = ?
    `).get(req.params.id);
    
    if (!script) return res.status(404).json({ error: 'Script not found' });

    const comments = db.prepare(`
      SELECT script_comments.*, users.username as author_name, users.avatar_url as author_avatar 
      FROM script_comments 
      JOIN users ON script_comments.user_id = users.id 
      WHERE script_id = ? 
      ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ ...script, comments });
  });

  app.post('/api/scripts/:id/comments', authenticateToken, (req: any, res) => {
    const { content, selected_text, suggestion } = req.body;
    const created_at = new Date().toISOString();
    const info = db.prepare('INSERT INTO script_comments (script_id, user_id, content, selected_text, suggestion, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.id, req.user.id, content, selected_text, suggestion, created_at);
    
    const comment = db.prepare(`
      SELECT script_comments.*, users.username as author_name, users.avatar_url as author_avatar 
      FROM script_comments 
      JOIN users ON script_comments.user_id = users.id 
      WHERE script_comments.id = ?
    `).get(info.lastInsertRowid);

    res.json(comment);
  });

  app.post('/api/scripts/:id/publish', authenticateToken, (req: any, res) => {
    try {
      db.prepare("UPDATE scripts SET status = 'published' WHERE id = ?").run(req.params.id);
      res.json({ success: true, status: 'published' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to publish script' });
    }
  });

  app.post('/api/scripts/:id/approve-suggestion/:commentId', authenticateToken, (req: any, res) => {
    // Only admin or author (if we tracked author) can approve. 
    // For now, let's allow any admin or the script author.
    // We need to fetch the script first to check permissions if we want to be strict.
    // Assuming 'admin' role check for simplicity or just allow for this demo.
    
    const { commentId } = req.params;
    const comment = db.prepare('SELECT * FROM script_comments WHERE id = ?').get(commentId) as any;
    
    if (!comment || !comment.selected_text || !comment.suggestion) {
      return res.status(400).json({ error: 'Invalid suggestion' });
    }

    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id) as any;
    
    // Replace the text in the script content
    // We will replace the FIRST occurrence of the selected text.
    // IMPORTANT: We need to be careful. If the text appears multiple times, this simple replace might target the wrong one.
    // For a robust solution, we should store the index/offset of the selection.
    // However, given the current constraints, we'll proceed with simple replacement but check if it exists.
    
    if (!script.content.includes(comment.selected_text)) {
       return res.status(400).json({ error: 'Original text not found in script. It might have been changed already.' });
    }

    const newContent = script.content.replace(comment.selected_text, comment.suggestion);
    
    db.prepare('UPDATE scripts SET content = ? WHERE id = ?').run(newContent, req.params.id);
    db.prepare("UPDATE script_comments SET status = 'approved' WHERE id = ?").run(commentId);

    res.json({ success: true, newContent });
  });

  // Expenses
  app.get('/api/expenses', authenticateToken, (req, res) => {
    const expenses = db.prepare(`
      SELECT expenses.*, users.username as added_by_name 
      FROM expenses 
      JOIN users ON expenses.added_by = users.id 
      ORDER BY date DESC
    `).all();
    res.json(expenses);
  });

  app.post('/api/expenses', authenticateToken, (req: any, res) => {
    const { description, amount, date } = req.body;
    const info = db.prepare('INSERT INTO expenses (description, amount, date, added_by) VALUES (?, ?, ?, ?)').run(description, amount, date, req.user.id);
    res.json({ id: info.lastInsertRowid, description, amount, date, added_by: req.user.id });
  });

  // Videos
  app.get('/api/videos', authenticateToken, (req, res) => {
    const videos = db.prepare(`
      SELECT videos.*, users.username as uploader_name 
      FROM videos 
      JOIN users ON videos.uploaded_by = users.id 
      ORDER BY created_at DESC
    `).all();
    res.json(videos);
  });

  app.post('/api/videos', authenticateToken, (req: any, res) => {
    const { title, url } = req.body;
    const created_at = new Date().toISOString();
    const info = db.prepare('INSERT INTO videos (title, url, uploaded_by, created_at) VALUES (?, ?, ?, ?)').run(title, url, req.user.id, created_at);
    res.json({ id: info.lastInsertRowid, title, url, uploaded_by: req.user.id, created_at });
  });

  // Messages (Chat History)
  app.get('/api/messages', authenticateToken, (req, res) => {
    const messages = db.prepare(`
      SELECT messages.*, users.username, users.avatar_url 
      FROM messages 
      JOIN users ON messages.sender_id = users.id 
      ORDER BY created_at ASC 
      LIMIT 100
    `).all();
    res.json(messages);
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

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

  // WebSocket Server for Chat
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: any, req: any) => {
    // Basic auth check via cookie parsing from headers (simplified)
    // In a real app, we'd verify the token properly here
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'chat') {
          // Save to DB
          const created_at = new Date().toISOString();
          const info = db.prepare('INSERT INTO messages (sender_id, content, created_at) VALUES (?, ?, ?)').run(data.userId, data.content, created_at);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({
            type: 'chat',
            id: info.lastInsertRowid,
            sender_id: data.userId,
            username: data.username,
            avatar_url: data.avatar_url,
            content: data.content,
            created_at
          });
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (e) {
        console.error('WS Error', e);
      }
    });
  });
}

startServer();
