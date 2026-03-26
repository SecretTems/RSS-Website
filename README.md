Room Reservation System (RRS)
=============================

A web application for managing room bookings, announcements, and schedules at PHINMA Araullo University.

## Features
- User authentication (login/signup)
- Browse and book rooms
- View schedules and availability
- Announcements with comments and reactions
- Admin panel for rooms/announcements management
- Responsive design for mobile/desktop
- AI chat assistant

## Tech Stack
- Frontend: HTML, CSS (custom), Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Deployment: Vercel

## Quick Setup (Development)
1. Install dependencies:
   ```
   npm install
   ```
2. Run seed script (optional, populates DB):
   ```
   node api/seed.js
   ```
3. Start server:
   ```
   npm start
   ```
4. Open http://localhost:3000

## Pages
- `/pages/announcements.html` - View announcements/comments
- `/pages/rooms.html` - Browse rooms
- `/pages/schedule.html` - View schedule
- `/pages/account.html` - User bookings/profile
- `/pages/admin.html` - Admin tools (login required)
- `/pages/login.html` - Sign in

## Deployment
Pushes to main deploys automatically to Vercel (vercel.json configured).

## API Routes
All under `/api/`:
- `/auth` - Authentication
- `/announcements` - CRUD + comments/likes
- `/rooms` - List rooms
- `/bookings` - Manage bookings
- `/ai` - AI chat

## License
MIT
