# 🛒 Bazaar@IITGN — The Community Exchange
**Track:** Software Development | **Status:** Check Point 1 Complete

Bazaar@IITGN is a specialized Progressive Web Application (PWA) designed as a high-performance, peer-to-peer marketplace for the **IIT Gandhinagar** community. It eliminates the friction of fragmented WhatsApp groups by providing a centralized engine for real-time negotiations, verified trust (Karma Score), and smart campus logistics.

---

## 📍 Check Point 1: Core Foundation
The project has successfully reached the first milestone with a fully functional full-stack skeleton.

- [x] **Monorepo Architecture:** Clean separation of `/client` (Frontend) and `/server` (Backend).
- [x] **Backend Heartbeat:** Node.js/Express server responding to RESTful requests.
- [x] **Cloud Database:** Live integration with **MongoDB Atlas** (NoSQL).
- [x] **Mobile-First UI:** React (Vite) frontend with responsive layout logic.
- [x] **DevOps & Security:** Private Git repository initialized with environment variable protection (`.gitignore`).

---

## 🛠️ Technical Stack

| Layer          | Technology                          | Role                                      |
| :------------- | :---------------------------------- | :---------------------------------------- |
| **Frontend** | React.js (Vite)                    | Fast, modern PWA-ready interface          |
| **Backend** | Node.js & Express                  | Scalable REST API & Middleware logic      |
| **Database** | MongoDB Atlas                      | Global cloud-hosted data persistence      |
| **Real-time** | Socket.io (Planned)                | Live chat and negotiation state machine   |
| **Auth** | Google OAuth (Planned)             | Restricted to `@iitgn.ac.in` domain       |

---

## 📂 Directory Structure
```text
D:\hackrush\
├── client/                # Frontend (Vite + React)
│   ├── public/            # Static assets & PWA manifest
│   ├── src/
│   │   ├── components/    # Reusable UI (Navbar, Cards, etc.)
│   │   ├── pages/         # Main Views (Home, Listing, Profile)
│   │   └── App.jsx        # Root component & Routing
├── server/                # Backend (Node + Express)
│   ├── config/            # Database & Env configurations
│   ├── models/            # Mongoose Schemas (User, Item, Offer)
│   ├── routes/            # API Endpoints
│   └── server.js          # Main Entry Point
├── .gitignore             # Root-level security file
└── README.md              # Project Documentation