// auth-routes.js – Complete authentication module for Express server
// Handles: register (email verify), login, forgot password, reset password, change password

import express from 'express';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ─── Config ─────────────────────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET || 'dev_secret_change_me';
const BASE_URL    = process.env.APP_BASE_URL || 'http://localhost:3000';
const FROM_EMAIL  = process.env.MAILTRAP_FROM || 'noreply@motobrake.store';

// ─── Mailtrap transporter ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAILTRAP_PORT || '2525'),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// ─── File-based DB helpers ───────────────────────────────────────────────────
const USERS_FILE  = path.join(__dirname, 'users.json');
const TOKENS_FILE = path.join(__dirname, 'auth-tokens.json');

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
  } catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, '{}');
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8') || '{}');
  } catch { return {}; }
}

function writeTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// ─── Token helpers ───────────────────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function saveToken(token, data, ttlMinutes = 60) {
  const tokens = readTokens();
  tokens[token] = { ...data, expiresAt: Date.now() + ttlMinutes * 60 * 1000 };
  writeTokens(tokens);
}

function getToken(token) {
  const tokens = readTokens();
  const data = tokens[token];
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    delete tokens[token];
    writeTokens(tokens);
    return null;
  }
  return data;
}

function deleteToken(token) {
  const tokens = readTokens();
  delete tokens[token];
  writeTokens(tokens);
}

// ─── Email templates ─────────────────────────────────────────────────────────
function emailTemplate(title, body) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Inter, Arial, sans-serif; background:#0c0e1a; color:#e0e0e0; margin:0; padding:20px; }
    .container { max-width:560px; margin:0 auto; background:#181d33; border-radius:12px; overflow:hidden; border:1px solid var(--color-border); }
    .header { background:linear-gradient(135deg,#7c3aed,#4f46e5); padding:32px 40px; }
    .header h1 { margin:0; color:var(--color-text-bright); font-size:22px; font-weight:800; }
    .header p { margin:6px 0 0; color:var(--color-muted); font-size:14px; }
    .body { padding:32px 40px; }
    .body p { line-height:1.7; color:var(--color-muted); }
    .btn { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; margin:16px 0; }
    .footer { padding:20px 40px; border-top:1px solid var(--color-border); font-size:12px; color:#666; }
    .code { display:inline-block; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c4b5fd; padding:4px 12px; border-radius:6px; font-family:monospace; font-size:16px; letter-spacing:2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏍️ MotoBrake Discs</h1>
      <p>Premium brake discs store</p>
    </div>
    <div class="body">
      <h2 style="color:var(--color-text-bright);margin-top:0;">${title}</h2>
      ${body}
    </div>
    <div class="footer">
      This email was sent automatically. If you didn't request this, please ignore it.
    </div>
  </div>
</body>
</html>`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const users = readUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = generateToken();

  const newUser = {
    id: Date.now(),
    username,
    email,
    passwordHash,
    password: '', // cleared - we use hash now
    role: 'user',
    manufacturer: '',
    verified: false,
    blocked: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);

  saveToken(verifyToken, { type: 'verify-email', userId: newUser.id }, 24 * 60);

  let testLink = null;
  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${verifyToken}`;
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: '✅ Confirm your MotoBrake account',
      html: emailTemplate('Confirm your email', `
        <p>Hi <strong>${username}</strong>! Welcome to MotoBrake Discs 🏍️</p>
        <p>Click the button below to verify your email and activate your account:</p>
        <a href="${verifyUrl}" class="btn">✅ Verify Email</a>
        <p style="font-size:13px;color:#888;">Link expires in 24 hours. If you didn't register, just ignore this email.</p>
      `),
    });
  } catch (err) {
    // If SMTP fails, pass the link to the frontend for easy testing
    testLink = verifyUrl;
  }

  res.json({ 
    success: true, 
    message: 'Registration successful! Check your email to verify your account.',
    testLink 
  });
});

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  const data = getToken(token);

  if (!data || data.type !== 'verify-email') {
    return res.send(`<html><body style="background:#0c0e1a;color:var(--color-text-bright);font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;"><h1 style="color:#ff5252;">❌ Invalid or expired link</h1>
      <p>Please register again.</p><a href="/" style="color:#7c3aed;">Back to shop</a></div></body></html>`);
  }

  const users = readUsers();
  const user = users.find(u => u.id === data.userId);
  if (!user) {
    return res.status(404).send('User not found');
  }

  user.verified = true;
  writeUsers(users);
  deleteToken(token);

  res.send(`<html><body style="background:#0c0e1a;color:var(--color-text-bright);font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;max-width:400px;">
      <div style="font-size:4rem;">✅</div>
      <h1 style="color:#00e676;">Email verified!</h1>
      <p style="color:var(--color-muted);">Your account <strong style="color:#c4b5fd;">${user.username}</strong> is now active. You can log in to the store.</p>
      <a href="/" style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">🏍️ Go to Shop</a>
    </div></body></html>`);
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  if (user.blocked) return res.status(403).json({ error: 'Your account has been blocked' });

  // Support both old plaintext and new hashed passwords
  let passwordOk = false;
  if (user.passwordHash) {
    passwordOk = await bcrypt.compare(password, user.passwordHash);
  } else {
    passwordOk = (user.password === password);
    if (passwordOk) {
      // Upgrade to hash on first login
      user.passwordHash = await bcrypt.hash(password, 10);
      user.password = '';
      writeUsers(users);
    }
  }

  if (!passwordOk) return res.status(401).json({ error: 'Invalid username or password' });

  // For non-system users, require email verification
  if (user.role === 'user' && !user.verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  const safeUser = { id: user.id, username: user.username, email: user.email, role: user.role, manufacturer: user.manufacturer };
  res.json({ success: true, user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const users = readUsers();
  const user = users.find(u => u.email === email);

  // Always respond OK (don't reveal if email exists)
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, you will receive a reset link.' });
  }

  const resetToken = generateToken();
  saveToken(resetToken, { type: 'reset-password', userId: user.id }, 60);

  let testLink = null;
  const resetUrl = `${BASE_URL}/reset-password.html?token=${resetToken}`;
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: '🔑 Reset your MotoBrake password',
      html: emailTemplate('Password Reset', `
        <p>Hi <strong>${user.username}</strong>!</p>
        <p>We received a request to reset your password. Click the button below to set a new one:</p>
        <a href="${resetUrl}" class="btn">🔑 Reset Password</a>
        <p style="font-size:13px;color:#888;">Link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email — your password won't change.</p>
      `),
    });
  } catch (err) {
    testLink = resetUrl;
  }

  res.json({ 
    success: true, 
    message: 'If that email exists, you will receive a reset link.',
    testLink
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const data = getToken(token);
  if (!data || data.type !== 'reset-password') {
    return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
  }

  const users = readUsers();
  const user = users.find(u => u.id === data.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.password = '';
  writeUsers(users);
  deleteToken(token);

  res.json({ success: true, message: 'Password successfully reset! You can now log in.' });
});

// POST /api/auth/change-password  (requires valid JWT)
router.post('/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const token = req.cookies?.jwt || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);

  if (!token) return res.status(401).json({ error: 'Not authorized' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const users = readUsers();
  const user = users.find(u => u.id === decoded.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let passwordOk = false;
  if (user.passwordHash) {
    passwordOk = await bcrypt.compare(oldPassword, user.passwordHash);
  } else {
    passwordOk = (user.password === oldPassword);
  }

  if (!passwordOk) return res.status(400).json({ error: 'Old password is incorrect' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.password = '';
  writeUsers(users);

  res.json({ success: true, message: 'Password changed successfully!' });
});

// GET /api/auth/me – validate token, return user info
router.get('/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const token = req.cookies?.jwt || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);
  if (!token) return res.status(401).json({ error: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const user = users.find(u => u.username === decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.blocked) return res.status(403).json({ error: 'User is blocked' });
    const safeUser = { id: user.id, username: user.username, email: user.email, role: user.role, manufacturer: user.manufacturer };
    res.json({ user: safeUser });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

export default router;
