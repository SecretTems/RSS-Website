import express from 'express';
import { getDatabase } from './db.js';
import {
  authenticateToken,
  getUserByEmail,
  getUserByUsername,
  createUser,
  verifyPassword,
  generateToken,
  getUserById
} from './auth.js';

const router = express.Router();

router.post('/auth/signup', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  if (getUserByEmail(email)) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  if (getUserByUsername(username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  try {
    const userId = createUser(username, email, password);
    const token = generateToken(userId);
    return res.status(201).json({ token, userId });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = generateToken(user.id);
  return res.json({ token, userId: user.id });
});

router.get('/announcements', (req, res) => {
  const db = getDatabase();
  const announcements = db.prepare(`
    SELECT id, title, content, created_at, likes, comments
    FROM announcements
    ORDER BY created_at DESC
  `).all();
  return res.json(announcements);
});

router.get('/rooms', (req, res) => {
  const db = getDatabase();
  const rooms = db.prepare(`
    SELECT id, room_name, status FROM rooms ORDER BY room_name
  `).all();
  return res.json(rooms);
});

router.get('/schedule/:roomId', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { roomId } = req.params;
  const schedule = db.prepare(`
    SELECT day, time_slot, status FROM schedule WHERE room_id = ?
  `).all(roomId);
  return res.json(schedule);
});

router.post('/bookings', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { roomId, startTime, endTime } = req.body;
  const userId = req.userId;

  if (!roomId || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO bookings (user_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?)'
    ).run(userId, roomId, startTime, endTime);
    return res.status(201).json({ bookingId: result.lastInsertRowid });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating booking' });
  }
});

router.get('/bookings', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.userId;
  const bookings = db.prepare(`
    SELECT b.id, b.room_id, r.room_name, b.start_time, b.end_time, b.status
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);
  return res.json(bookings);
});

router.delete('/bookings/:bookingId', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { bookingId } = req.params;
  const userId = req.userId;

  const booking = db.prepare('SELECT user_id FROM bookings WHERE id = ?').get(bookingId);
  if (!booking || booking.user_id !== userId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
  return res.json({ message: 'Booking deleted' });
});

router.post('/announcements/:announcementId/like', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { announcementId } = req.params;
  const userId = req.userId;

  try {
    db.prepare(
      'INSERT OR IGNORE INTO announcement_likes (user_id, announcement_id) VALUES (?, ?)'
    ).run(userId, announcementId);
    const announcement = db.prepare('SELECT likes FROM announcements WHERE id = ?').get(announcementId);
    return res.json({ likes: announcement.likes + 1 });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding like' });
  }
});

router.get('/profile', authenticateToken, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json(user);
});

router.put('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { username } = req.body;
  const userId = req.userId;

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existing) {
      return res.status(400).json({ message: 'Username already taken' });
    }
  }

  try {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username || getUserById(userId).username, userId);
    return res.json({ message: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating profile' });
  }
});

router.delete('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.userId;

  try {
    db.prepare('DELETE FROM bookings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM announcement_likes WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return res.json({ message: 'Account deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting account' });
  }
});

router.post('/chat', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { message } = req.body;
  const userId = req.userId;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const response = generateAIResponse(message);

  try {
    db.prepare(
      'INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)'
    ).run(userId, message, response);
    return res.json({ response });
  } catch (error) {
    return res.status(500).json({ message: 'Error processing chat' });
  }
});

function generateAIResponse(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('room') || lowerMessage.includes('book')) {
    return 'You can book rooms from the Rooms section. Select an available room and choose your preferred time slot.';
  }
  if (lowerMessage.includes('schedule')) {
    return 'Visit the Schedule page to see the availability of all rooms. Click on the Schedule tab in the navigation.';
  }
  if (lowerMessage.includes('announcement')) {
    return 'Check the Announcements page for the latest updates and news from the university.';
  }
  if (lowerMessage.includes('profile')) {
    return 'You can edit your profile by clicking on the account icon and selecting Edit Profile.';
  }
  if (lowerMessage.includes('help')) {
    return 'I can help you with booking rooms, viewing schedules, managing your profile, and more. What would you like to do?';
  }

  return 'I\'m here to help! You can ask me about booking rooms, viewing schedules, or managing your account.';
}

export default router;
