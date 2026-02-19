const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message, err.stack);
});

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('/?')) uri = uri.replace('/?', '/rrs?');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  console.log('MongoDB connected');
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed: ' + err.message });
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date(),
    db: isConnected ? 'connected' : 'disconnected',
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSeedSecret: !!process.env.SEED_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

try {
  app.use('/api/seed',          require('./routes/seed'));
  app.use('/api/auth',          require('./routes/auth'));
  app.use('/api/announcements', require('./routes/announcements'));
  app.use('/api/rooms',         require('./routes/rooms'));
  app.use('/api/bookings',      require('./routes/bookings'));
  app.use('/api/ai',            require('./routes/ai'));
  app.use('/api/users',         require('./routes/users'));
} catch (err) {
  console.error('Route load error:', err.message);
  app.use('/api/*', (req, res) => {
    res.status(500).json({ success: false, message: 'Route load failed: ' + err.message });
  });
}

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
