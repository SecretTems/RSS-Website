# RRS — Room Reservation System
**PHINMA Araullo University**

A full-stack web application for booking and managing classrooms.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (BEM), Vanilla JS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Auth | JWT + bcrypt (httpOnly cookies) |
| Hosting | Vercel (serverless + static) |
| Validation | express-validator (server) + custom JS (client) |

---

## 📁 Project Structure

```
rrs/
├── api/
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Booking.js
│   │   └── Announcement.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── announcements.js
│   │   ├── rooms.js
│   │   ├── bookings.js
│   │   ├── ai.js
│   │   └── users.js
│   ├── server.js
│   └── seed.js
├── public/
│   ├── css/
│   │   └── styles.css        ← All styles (BEM)
│   ├── js/
│   │   ├── utils.js          ← Shared helpers (API, auth, toast)
│   │   └── navbar.js         ← Navbar injection
│   └── pages/
│       ├── login.html
│       ├── signup.html
│       ├── announcements.html
│       ├── schedule.html
│       ├── rooms.html
│       ├── ai-chat.html
│       └── account.html
├── .env.example
├── .gitignore
├── package.json
└── vercel.json
```

---

## ⚡ Quick Start (Local Dev)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd rrs
npm install
```

### 2. Set up Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rrs
JWT_SECRET=some_long_random_secret_string_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Seed the Database
```bash
node api/seed.js
```

This creates:
- 9 rooms (Classroom 301–309)
- Admin user: `admin@phinma.edu` / `Admin1234`
- Sample announcements

### 4. Run the Server
```bash
npm run dev       # development (nodemon)
npm start         # production
```

Visit: `http://localhost:3000`

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework Preset: **Other**
4. Root Directory: `/` (leave as-is)

### 3. Set Environment Variables in Vercel
In the Vercel dashboard → **Settings → Environment Variables**, add:
```
MONGODB_URI        = mongodb+srv://...
JWT_SECRET         = your_secret
JWT_EXPIRES_IN     = 7d
NODE_ENV           = production
FRONTEND_URL       = https://your-app.vercel.app
```

### 4. Deploy
Vercel auto-deploys on every `git push` to `main`.

### 5. Seed your production DB
After deploying, run seed locally against your Atlas URI:
```bash
node api/seed.js
```

---

## 🔌 API Reference

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Public | Logout |
| GET | `/api/auth/me` | Protected | Get current user |
| DELETE | `/api/auth/delete-account` | Protected | Delete own account |

### Announcements
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/announcements` | Protected | List all |
| POST | `/api/announcements` | Admin | Create |
| PATCH | `/api/announcements/:id/like` | Protected | Toggle like |
| PATCH | `/api/announcements/:id/heart` | Protected | Toggle heart |
| DELETE | `/api/announcements/:id` | Admin | Delete |

### Rooms
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/rooms?date=YYYY-MM-DD` | Protected | List with status |
| GET | `/api/rooms/schedule?date=YYYY-MM-DD` | Protected | Schedule grid data |
| POST | `/api/rooms` | Admin | Create room |
| DELETE | `/api/rooms/:id` | Admin | Deactivate room |

### Bookings
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/bookings/my` | Protected | Own bookings |
| POST | `/api/bookings` | Protected | Create booking |
| DELETE | `/api/bookings/:id` | Protected | Cancel booking |

### AI Chat
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/ai/chat` | Protected | Send message |

### Users
| Method | Route | Access | Description |
|---|---|---|---|
| PATCH | `/api/users/profile` | Protected | Update username/photo |

---

## 🔒 Security Features

- Passwords hashed with **bcrypt** (12 salt rounds)
- Auth via **JWT** stored in httpOnly cookies + Authorization header
- **Rate limiting**: 100 req/15min globally, 10 req/15min for auth routes
- **Input validation** server-side (express-validator) and client-side
- **CORS** configured for production domain only
- Conflict detection prevents double-booking

---

## 👤 Roles

| Role | Capabilities |
|---|---|
| `user` | Book rooms, cancel own bookings, react to announcements, use AI chat |
| `admin` | Everything above + create/delete announcements, create/deactivate rooms |

To make a user admin, update MongoDB directly:
```js
db.users.updateOne({ email: "user@email.com" }, { $set: { role: "admin" } })
```

Or use MongoDB Atlas UI.

---

## 📱 Pages

| Page | Path | Description |
|---|---|---|
| Login | `/pages/login.html` | Auth gate |
| Sign Up | `/pages/signup.html` | Registration |
| Announcements | `/pages/announcements.html` | Home/news feed |
| Schedule | `/pages/schedule.html` | Calendar + room grid |
| Rooms | `/pages/rooms.html` | Book a room |
| AI Chat | `/pages/ai-chat.html` | AI assistant |
| Account | `/pages/account.html` | Profile, history, settings |
