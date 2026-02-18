import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  next();
}

export function getUserById(userId) {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, email, profile_photo, created_at FROM users WHERE id = ?').get(userId);
  return user || null;
}

export function getUserByEmail(email) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserByUsername(username) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function createUser(username, email, password) {
  const db = getDatabase();
  const passwordHash = hashPassword(password);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, passwordHash);
    return result.lastInsertRowid;
  } catch (error) {
    throw error;
  }
}
