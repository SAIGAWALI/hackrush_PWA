# BAZAAR — IIT Gandhinagar Campus Marketplace

> A real-time peer-to-peer marketplace exclusively for IITGN students (@iitgn.ac.in email verification required).

**Status:** Production-ready | Security-hardened | Mobile-optimized
**website link:** bazaar-iitgn.netlify.app

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Security](#security)

---

## Features

### Core Marketplace
- Multi-image listings (up to 4 images with drag-to-reorder)
- Item listings with 8 categories + custom option
- Hostel-based location filtering (13 hostels)
- Karma system (grows with sales & positive reviews)
- Watchlist/Bookmark functionality
- Urgent sale priority toggle

### Real-time Communication
- Live Socket.io chat with typing indicators
- File sharing (images, videos, documents)
- Offer system (pending/accepted/rejected states)
- Message history synced to database
- Quick-reply buttons for offers

### User Trust & Safety
- Flag/Report system (report items or sellers)
- Admin dashboard for moderation
- Account disabling (reversible bans)
- 5-star buyer review system
- Public karma scores shown on listings

### Admin Features
- Flag moderation (Resolve/Dismiss)
- Member management (view all users)
- Member actions (disable account, reduce karma, remove products)
- Activity stats (email, karma, listings count)

### UI/UX
- Mobile-first responsive design
- Dark-themed header, warm orange accents
- Smooth animations & transitions
- Image gallery with thumbnails
- Skeleton loading states
- Real-time search & filtering

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|----------|---------|
| Frontend | React 18 + Vite | Ultra-fast development builds |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Routing | React Router v6 | Client-side navigation |
| Auth | Firebase (Google OAuth) | IITGN email verification |
| Real-time | Socket.io | Live chat & notifications |
| Backend | Express.js + Node.js | REST API server |
| Database | MongoDB Atlas | Cloud document database |
| ODM | Mongoose | Schema validation & relations |
| Images | Cloudinary | Cloud image hosting |

---

## Project Structure

```
bazaar/
├── server/
│   ├── .env                    # Server config (not in git)
│   ├── server.js               # Express + Socket.io
│   ├── User.js                 # User schema
│   ├── Message.js              # Chat, review, flag schemas
│   └── package.json
│
├── client/
│   ├── .env                    # Client config (not in git)
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Main router
│   │   ├── config/constants.js # Centralized API_URL
│   │   ├── services/
│   │   │   ├── auth.js         # Firebase config
│   │   │   └── socket.js       # Socket.io client
│   │   ├── pages/
│   │   │   ├── Auth.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── ItemDetail.jsx
│   │   │   ├── Sell.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Watchlist.jsx
│   │   │   ├── Inbox.jsx
│   │   │   └── Admin.jsx
│   │   └── components/
│   │       ├── Chat.jsx
│   │       ├── ImageUpload.jsx
│   │       ├── Navbar.jsx
│   │       └── BottomNav.jsx
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- MongoDB Atlas account
- Firebase project
- Cloudinary account

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/bazaar.git
cd bazaar
```

### 2. Server Setup
```bash
cd server
npm install

# Create .env file with your values:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bazaar
# ADMIN_EMAIL=your-email@iitgn.ac.in
# CORS_ORIGIN=http://localhost:5173
# PORT=5000
# NODE_ENV=development

node server.js
```

### 3. Client Setup
```bash
cd ../client
npm install

# Create .env file with your values:
# VITE_API_URL=http://localhost:5000
# VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
# VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your-project-id

npm run dev
```

### 4. Open Browser
Go to http://localhost:5173 and sign in with @iitgn.ac.in email

---

## Environment Setup

### Server .env
| Variable | Purpose | Example |
|----------|---------|---------|
| MONGO_URI | MongoDB connection | mongodb+srv://... |
| ADMIN_EMAIL | Admin email | admin@iitgn.ac.in |
| CORS_ORIGIN | Allowed origins | http://localhost:5173 |
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development or production |

### Client .env
| Variable | Purpose |
|----------|---------|
| VITE_API_URL | Backend API endpoint |
| VITE_CLOUDINARY_CLOUD_NAME | Cloudinary cloud |
| VITE_CLOUDINARY_UPLOAD_PRESET | Upload preset |
| VITE_FIREBASE_* | Firebase credentials |

---

## API Documentation

### Authentication
- POST /api/users/sync — Sync user on login (validates @iitgn.ac.in)

### Items
- GET /api/items — List all items (filterable)
- GET /api/items/:id — Get item details
- POST /api/items — Create listing
- PATCH /api/items/:id/sold — Mark as sold, update karma
- DELETE /api/items/:id — Remove listing

### User Data
- GET /api/users/karma?email= — Get karma score
- POST /api/users/bookmark — Toggle bookmark
- GET /api/users/all — List users (admin only)

### Chat & Offers
- Socket.io /api/messages — Real-time chat
- Socket.io /api/conversations — Conversations
- POST /api/conversations/init — Start conversation

### Reviews
- POST /api/reviews — Submit review (-1, 0, +1)
- GET /api/reviews/:email — Get reviews

### Flags
- POST /api/flags — Report item/user
- GET /api/flags — Get flags (admin only)
- PATCH /api/flags/:id — Update flag (admin only)

### Admin
- POST /api/admin/action-member — Disable/reduce karma (admin only)

---

## Architecture

### Data Flow
```
User (Browser)
    ↓
Firebase Auth ← → Client (React + Vite)
    ↓                ↓
    ← ← ← Socket.io ← ← ←
                ↓
           Express.js
                ↓
Cloudinary ← → MongoDB
```

### Authentication Flow
1. User logs in via Google OAuth
2. Firebase generates JWT token
3. Client calls POST /api/users/sync
4. Server validates @iitgn.ac.in domain
5. User synced to MongoDB

### Real-time Chat
1. User clicks "Chat" on item
2. Deterministic room ID created: sorted(email1, email2, itemId)
3. Socket.io connects to room
4. Messages synced to MongoDB
5. Both users see real-time updates

---

## Deployment

### Backend (Heroku, Railway, etc.)

1. Set environment variables:
```
MONGO_URI=mongodb+srv://...
ADMIN_EMAIL=prod-admin@iitgn.ac.in
CORS_ORIGIN=https://yourdomain.com
PORT=5000
NODE_ENV=production
```

2. Deploy:
```bash
git push heroku main
```

### Frontend (Vercel, Netlify, etc.)

1. Build:
```bash
cd client
VITE_API_URL=https://api.yourdomain.com npm run build
```

2. Deploy `dist/` folder to your platform

3. Set environment variables in platform settings

---

## Security

### Email Verification
- Server-side validation ensures only @iitgn.ac.in emails
- Firebase email verification before first login
- Admin actions verified server-side

### CORS Protection
- CORS whitelist restricts unknown origins
- Credentials required for cross-origin requests
- Protects against unauthorized API access

### Admin Panel
- Single admin email from ADMIN_EMAIL env variable
- All admin endpoints verify requestor email
- Account disabling is reversible

### Data Privacy
- .env files in .gitignore (never committed)
- No API keys hardcoded in source code
- Sensitive errors logged server-side only

---

## Karma System

| Action | Points |
|--------|--------|
| Complete sale | +1 |
| Receive 5-star review | +1 |
| Receive 3-star review | 0 |
| Receive 1-star review | -1 |
| Admin reduces karma | -X |

- Displayed on listings, profiles
- Grows with positive transactions
- No maximum cap

---

## Key Routes

### User Facing
- `/` — Marketplace feed
- `/item/:id` — Item details + chat
- `/sell` — Create listing
- `/profile` — User dashboard
- `/watchlist` — Saved items
- `/inbox` — Conversations
- `/auth` — Login/signup

### Admin Only
- `/admin` — Admin dashboard

---

## Contributing

Before committing:
```bash
cd client
npm run lint
```

---

## License

Private project for IIT Gandhinagar students.

---

## Support

**Firebase auth failing?** 
- Ensure .env has correct Firebase credentials

**MongoDB connection error?** 
- Verify MONGO_URI and IP whitelist in Atlas

**Images not uploading?** 
- Check Cloudinary credentials and preset

**Admin access denied?** 
- Only ADMIN_EMAIL from server .env can access
- Ensure logged in as admin account

---

## Troubleshooting

### "Only @iitgn.ac.in emails allowed"
- Use your IIT Gandhinagar email

### "Cannot connect to server"
- Check VITE_API_URL in client .env
- Verify server running on localhost:5000

### "Failed to upload image"
- Verify Cloudinary credentials
- Image must be < 10MB

---

## What This Project Demonstrates

- Full-stack MERN development
- Real-time Socket.io communication
- Firebase authentication
- Responsive mobile-first design
- Security best practices
- Database modeling (MongoDB)
- RESTful API design
- Component-based architecture

---

**Last Updated:** April 2026  
**Version:** 1.0.0  
**Built for:** HackRush, IIT Gandhinagar
