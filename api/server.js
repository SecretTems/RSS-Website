require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// ── MongoDB: reuse connection across Vercel serverless cold starts ──
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  // Ensure a database name is in the URI (inject "rrs" before query params if missing)
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('/?')) {
    uri = uri.replace('/?', '/rrs?');
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  console.log('✅ MongoDB connected');
}

// Run connection before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed.' });
  }
});

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// ── Middleware ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/', limiter);

// ── Routes ──
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/users', require('./routes/users'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'RRS API is running', timestamp: new Date() });
});

// ── 404 for unknown API routes ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Local dev only ──
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;
