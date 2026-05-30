import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import authRoutes from './auth-routes.js';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function getAuthUser(req) {
  const token = req.cookies?.jwt || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow same-origin (no Origin header) and any local dev origin
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many API requests, please try again later." }
});

// Mount auth routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/db', apiLimiter);


// Serve static files — no-cache for JS/HTML so updates apply immediately
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'assets', 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const baseName = req.body.slug ? req.body.slug : Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${baseName}-${Math.round(Math.random()*1000)}${ext}`);
  }
});
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Database mapping helper
const DB_MAPPING = {
  "brakeProducts": "products.json",
  "brakeOrders": "orders.json",
  "brakeUsers": "users.json",
  "brakeMessages": "messages.json",
  "brakeSiteSettings": "settings.json",
  "brakeCustomRequests": "custom_requests.json",
  "brakeClients": "clients.json",
  "brakeWithdrawals": "withdrawals.json",
  "brakeCommissionSettlements": "commission_settlements.json"
};

// Ensure all database files exist and contain valid JSON
Object.entries(DB_MAPPING).forEach(([key, filename]) => {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    // Write products as seed, others as empty array or empty object depending on type
    let defaultContent = '[]';
    if (key === 'brakeSiteSettings') {
      defaultContent = '{}';
    }
    fs.writeFileSync(filePath, defaultContent);
  }
});

// GET endpoints for generic db
app.get('/api/db/:key', (req, res) => {
  const key = req.params.key;
  const filename = DB_MAPPING[key];
  if (!filename) {
    return res.status(400).json({ error: `Invalid db key: ${key}` });
  }
  
  if (key === 'brakeUsers') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: "Forbidden: Only superadmin can access users list." });
    }
  }

  try {
    const filePath = path.join(__dirname, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data || (key === 'brakeSiteSettings' ? '{}' : '[]')));
  } catch (err) {
    res.status(500).json({ error: `Failed to read database for ${key}` });
  }
});

// --- Chat API Endpoints ---
app.get('/api/chat', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const filePath = path.join(__dirname, 'messages.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    if (user.role === 'superadmin' || user.role === 'admin') {
      res.json(data);
    } else {
      res.json(data.filter(m => m.username === user.username));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read messages' });
  }
});

app.post('/api/chat/send', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const filePath = path.join(__dirname, 'messages.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    
    const newMsg = {
      id: Date.now(),
      username: user.role === 'user' ? user.username : (req.body.targetUser || user.username),
      sender: (user.role === 'admin' || user.role === 'superadmin') ? 'admin' : 'user',
      text: req.body.text || '',
      date: new Date().toISOString(),
      readByAdmin: (user.role === 'admin' || user.role === 'superadmin'),
      manufacturer: req.body.manufacturer || (user.role === 'admin' ? user.manufacturer : 'Garage1'),
      file: req.body.file || null,
      fileName: req.body.fileName || null,
      fileType: req.body.fileType || null
    };
    
    data.push(newMsg);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: newMsg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write message' });
  }
});

app.post('/api/chat/read', (req, res) => {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const filePath = path.join(__dirname, 'messages.json');
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    const { targetUser, manufacturer } = req.body;
    let changed = false;
    data = data.map(m => {
      const mMfg = m.manufacturer || "Garage1";
      if (m.username === targetUser && mMfg === (manufacturer || "Garage1") && m.sender === 'user' && !m.readByAdmin) {
        m.readByAdmin = true;
        changed = true;
      }
      return m;
    });
    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update messages' });
  }
});

// POST endpoints for generic db
app.post('/api/db/:key', (req, res) => {
  const key = req.params.key;
  const filename = DB_MAPPING[key];
  if (!filename) {
    return res.status(400).json({ error: `Invalid db key: ${key}` });
  }

  // RBAC for generic db endpoint
  const user = getAuthUser(req);
  const role = user ? user.role : 'guest';

  if (role !== 'superadmin') {
    // Admins can only edit products
    if (role === 'admin' && key !== 'brakeProducts') {
      return res.status(403).json({error: "Forbidden: Admins can only modify products."});
    }
    // Users/Guests can only edit orders, clients, and stock updates (brakeProducts)
    else if (['user', 'guest'].includes(role) && !['brakeOrders', 'brakeClients', 'brakeProducts'].includes(key)) {
      return res.status(403).json({error: `Forbidden: Role '${role}' cannot modify ${key}.`});
    }
  }
  
  try {
    const filePath = path.join(__dirname, filename);
    const body = req.body;
    // Client might wrap value in an object or send raw JSON
    const content = typeof body === 'object' && body.data !== undefined ? body.data : JSON.stringify(body, null, 2);
    const finalString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    
    fs.writeFileSync(filePath, finalString);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to write database for ${key}` });
  }
});

// Upload image endpoint
app.post('/api/upload', (req, res, next) => {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return res.status(403).json({ error: "Forbidden: Only admins can upload files." });
  }
  next();
}, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `/assets/images/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Error handling for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Invalid file type. Only images are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
