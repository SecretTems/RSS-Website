/**
 * RRS — Database Seed Script
 * Run: node api/seed.js
 * Seeds: admin user + 9 classrooms + sample announcements
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Room = require('./models/Room');
const Announcement = require('./models/Announcement');

async function seed() {
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('/?')) uri = uri.replace('/?', '/rrs?');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // Clear existing
  await Room.deleteMany({});
  await Announcement.deleteMany({});
  console.log('🗑️  Cleared rooms and announcements');

  // Create rooms 301-309
  const rooms = [];
  for (let i = 1; i <= 9; i++) {
    rooms.push({
      name: `Classroom 30${i}`,
      number: `30${i}`,
      capacity: 40,
      description: `Lecture room on the 3rd floor`
    });
  }
  await Room.insertMany(rooms);
  console.log('🚪 Created 9 rooms (301–309)');

  // Create admin user (if doesn't exist)
  let admin = await User.findOne({ email: 'admin@phinma.edu' });
  if (!admin) {
    admin = await User.create({
      username: 'admin',
      email: 'admin@phinma.edu',
      password: 'Admin1234',
      role: 'admin'
    });
    console.log('👤 Created admin user: admin@phinma.edu / Admin1234');
  } else {
    console.log('👤 Admin user already exists');
  }

  // Sample announcements
  await Announcement.insertMany([
    {
      title: 'New Reservation System',
      content: 'We made a reservation system',
      author: admin._id,
      createdAt: new Date('1999-12-30')
    },
    {
      title: 'Day 1 Patches',
      content: 'Minor Bug fixes',
      author: admin._id,
      createdAt: new Date('2000-06-04')
    },
    {
      title: 'New AI Integration',
      content: 'We have integrated an AI into the reservation system to further improve QOL',
      author: admin._id,
      createdAt: new Date('2023-04-02')
    },
    {
      title: 'Rushed wireframing causes jank',
      content: 'Turns out rushing a wireframe will make it feel and look off',
      author: admin._id,
      createdAt: new Date('2024-01-05')
    }
  ]);
  console.log('📢 Created sample announcements');

  await mongoose.disconnect();
  console.log('✅ Seed complete!');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
