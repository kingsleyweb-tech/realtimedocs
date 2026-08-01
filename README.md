# RealtimeDocs 📝
### Collaborative Real-time Document Editing Platform

**RealtimeDocs** is a modern Google Docs clone built for lightning-fast, collaborative, distraction-free document writing and editing. Multiple users can edit the same document simultaneously and see each other's cursors in real time.

🌐 **Live Demo**: Hosted on [Netlify (Frontend)](https://netlify.com) + [Render (Backend)](https://render.com)

---

## 🏗️ Project Architecture Overview

RealtimeDocs is split into two primary environments:

1. **Frontend (`client/`)**: A Single Page React Application built with TypeScript, Vite, and CSS. Authenticates users via Firebase and connects to the backend via Socket.io for real-time sync.
2. **Backend (`server/`)**: A Node.js & Express server running TypeScript. Connects to MongoDB using Mongoose and uses Socket.io to manage room-based live editing, presence tracking, and cursor sync.

```
                    ┌────────────────────────┐
                    │  Firebase Auth Service  │
                    └───────────▲────────────┘
                                │ (Google Sign-In)
                                ▼
┌──────────────────┐      Websockets      ┌──────────────────┐
│  React Client    ├─────────────────────►│  Node.js Server  │
│  (Vite + TSX)    │  (Socket.io-client)  │  (Socket.io)     │
│  Netlify         │                      │  Render          │
└──────────────────┘                      └────────▲─────────┘
                                                   │ (Mongoose)
                                                   ▼
                                          ┌──────────────────┐
                                          │  MongoDB Atlas   │
                                          └──────────────────┘
```

---

## 📦 Installed Packages & Why They Are Needed

### 1. Frontend Packages (`client/package.json`)
- **`react` & `react-dom`**: The foundation libraries for building dynamic, interactive user interfaces in components.
- **`react-router-dom`**: Enables single-page routing (navigating between `/dashboard`, `/starred`, `/trash`, and `/document/:id` without refreshing the tab).
- **`firebase`**: Connects directly to Google Firebase to run secure user authentication using Google Sign-in.
- **`socket.io-client`**: The client-side library that establishes persistent, real-time connections with our backend socket server.
- **`vite`**: A fast build tool that bundles the project and runs the development server with Hot Module Replacement (HMR).

### 2. Backend Packages (`server/package.json`)
- **`express`**: A lightweight web framework used to expose REST health endpoints (e.g. `GET /`, `GET /db-status`).
- **`mongoose`**: An Object Data Modeling (ODM) library for MongoDB. Allows us to define schemas for Documents and Users and write clean queries.
- **`socket.io`**: The backend library that coordinates real-time events, grouping connections into isolated "rooms" so users only share edits with others on the same document.
- **`dotenv`**: Loads environment variables from a `.env` file in local development. In production on Render, variables are set directly.
- **`ts-node-dev`**: A development tool that compiles TypeScript on-the-fly and restarts the server automatically whenever you edit backend code.

---

## 📁 File Structure & Directory Guide

### Frontend Directory (`client/src/`)

```
client/src/
├── App.tsx                  ← React Router routing switchboard (maps URLs to pages)
├── index.css                ← Global CSS stylesheet (layout, sidebar, modals, responsive)
├── assets/
│   └── docs.jpg             ← Logo image
├── components/
│   ├── DocSidebar.tsx       ← Navigation sidebar (links, recent docs, user profile)
│   ├── Icons.tsx            ← All SVG icon components (IconMenu, IconTrash, etc.)
│   └── ToastContainer.tsx   ← Toast notification system
├── firebase/
│   └── firebase.ts          ← Firebase app initialization & Google Auth provider setup
├── pages/
│   ├── Home.tsx             ← Public landing/splash page
│   ├── Login.tsx            ← "Continue with Google" login page
│   ├── Register.tsx         ← User registration page
│   ├── Dashboard.tsx        ← Main view: all active documents + "new document" card
│   ├── Starred.tsx          ← Documents flagged as starred by the user
│   ├── SharedWithMe.tsx     ← Documents shared with the current user by others
│   ├── Trash.tsx            ← Deleted documents (restore or permanently delete)
│   └── Document.tsx         ← Main editing canvas with toolbar, cursors, sharing modal
├── socket/
│   └── socket.ts            ← Socket.io client instance (single shared connection)
└── utils/
    ├── caretCoordinates.ts  ← Calculates pixel position of cursor inside a textarea
    └── toast.ts             ← Helper to trigger toast notifications
```

### Backend Directory (`server/src/`)

```
server/src/
├── server.ts                ← Entry point: HTTP server, Socket.io setup, REST routes (~50 lines)
├── config/
│   └── database.ts          ← Mongoose connection setup (connects to MongoDB Atlas)
├── handlers/
│   └── socketHandlers.ts    ← ALL Socket.io event handlers (join, edit, share, presence...)
├── models/
│   ├── User.ts              ← MongoDB schema for a user (uid, email, displayName, photoURL)
│   └── Document.ts          ← MongoDB schema for a document (content, collaborators, access...)
└── utils/
    └── documentHelper.ts    ← getUserDocuments() — shared query helper used by handlers
```

---

## ⚡ How Websockets Work (Live Collaboration)

Websockets keep a **constant two-way pipe** open between client and server. Both sides can push messages instantly without polling.

```
┌───────────┐                      ┌───────────┐
│ User A    │                      │ User B    │
└─────┬─────┘                      └─────▲─────┘
      │                                  │
      │ 1. Emits "document-change"       │ 3. Broadcasts "document-update"
      │    (sends updated text)          │    (sends text to User B)
      ▼                                  │
┌────────────────────────────────────────┴─────┐
│               Socket.io Server               │
│           (socketHandlers.ts)                │
└──────────────────────────────────────────────┘
```

### Socket Events Reference

| Event (Client → Server) | What it does |
|---|---|
| `save-user` | Saves or updates the user profile in MongoDB on first login |
| `join-document` | Joins a Socket.io room, loads content, validates access role |
| `document-change` | Saves a text edit and broadcasts to all others in the room |
| `rename-document` | Renames a document title after validating editor role |
| `get-user-documents` | Fetches all documents owned or shared with a user |
| `toggle-star-document` | Stars or unstars a document |
| `trash-document` | Moves a document to trash |
| `restore-document` | Recovers a document from trash |
| `delete-document-permanent` | Permanently deletes a document from MongoDB |
| `get-sharing-settings` | Retrieves collaborator list and public access settings |
| `update-sharing-settings` | Updates collaborators and public access (owner only) |
| `cursor-move` | Broadcasts the user's cursor position to others in the room |
| `leave-document` | Cleans up presence data when a user exits the document |

| Event (Server → Client) | What it does |
|---|---|
| `load-document` | Delivers document content, title, and role to the joining client |
| `document-update` | Pushes another user's edits to all other clients in the room |
| `document-renamed` | Notifies all clients of a title change |
| `user-documents` | Sends the user's full document list (for dashboard / sidebar) |
| `presence-update` | Sends an updated list of active users in the room |
| `cursor-update` | Delivers a collaborator's cursor position for rendering |
| `sharing-settings` | Returns sharing modal data to the requesting client |
| `sharing-updated` | Notifies everyone in the room of changed sharing settings |
| `access-denied` | Redirects the user if they don't have permission to view the document |

---

## 🗄️ Database & Mongoose (MongoDB Atlas)

**MongoDB** is a NoSQL document database. **Mongoose** is the translator that lets Node.js speak to it using defined schemas.

### User Model (`User.ts`)
Stores profile information for every user that has signed in.

| Field | Type | Description |
|---|---|---|
| `uid` | String | Firebase unique user ID |
| `email` | String | Google account email |
| `displayName` | String | Full name from Google profile |
| `photoURL` | String | Google profile picture URL |

### Document Model (`Document.ts`)
Stores everything about a document.

| Field | Type | Description |
|---|---|---|
| `documentId` | String | Unique random ID (generated on client) |
| `title` | String | Document title (default: "Untitled document") |
| `content` | String | Full text content of the document |
| `ownerId` | String | Firebase UID of the creator |
| `ownerEmail` | String | Email of the creator |
| `collaborators` | Array | `[{ email, role }]` — list of invited users |
| `publicAccess` | String | `"restricted"`, `"viewer"`, or `"editor"` |
| `isStarred` | Boolean | Whether the owner has starred this document |
| `isTrashed` | Boolean | Whether the document is in the trash |
| `lastUpdated` | Date | Timestamp of the most recent save |

---

## 🔑 Authentication Flow

Authentication uses **Google Sign-In via Firebase**:

1. **Sign In**: Clicking "Continue with Google" opens a secure Firebase popup.
2. **Account Picker**: `googleProvider.setCustomParameters({ prompt: "select_account" })` forces the Google account picker every time so users don't get auto-logged in.
3. **Session Persistence**: Set to `browserSessionPersistence` — the session expires when the browser tab is closed.
4. **Sync to Database**: After sign-in, the client emits `save-user` to the server. If it's the user's first login, a new record is created in MongoDB. This record is needed so other users can share documents using your email address.

---

## 📱 Mobile Responsiveness

The interface adapts to all screen sizes similar to Google Docs:

- **Hamburger Menu**: A ☰ button appears in the top toolbar on mobile (hidden on desktop). Tapping it slides the sidebar in as a drawer overlay.
- **Backdrop**: A dim overlay appears behind the sidebar on mobile; tapping it closes the sidebar.
- **Hidden Controls**: The "Full Screen" and "Logout" buttons are hidden on mobile screens — logout is accessible inside the sidebar instead.
- **Fixed Sidebar**: On desktop, the sidebar is `position: sticky` so it never scrolls out of view while browsing your documents.

---

## 💡 TypeScript File Types: `.ts` vs `.tsx`

| Extension | Used For | Examples |
|---|---|---|
| `.ts` | Pure logic, no JSX (HTML-like code) | `server.ts`, `socket.ts`, `documentHelper.ts` |
| `.tsx` | Contains JSX — React UI components | `Dashboard.tsx`, `DocSidebar.tsx`, `Document.tsx` |

---

## 🚀 Running the Project Locally

### Prerequisites
- **Node.js** v18+
- A **MongoDB Atlas** cluster (or local MongoDB running at `mongodb://localhost:27017`)
- A **Firebase project** with Google Sign-In enabled

### Step 1: Clone & Configure Environment Variables

**Server** — create `server/.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/realtimeDocs
PORT=3000
```

**Client** — create `client/.env`:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_SOCKET_URL=http://localhost:3000
```

### Step 2: Start the Backend
```bash
cd server
npm install
npm run dev
```
The socket server runs on **port 3000**.

### Step 3: Start the Frontend
```bash
cd client
npm install
npm run dev
```
The React app opens at **http://localhost:5173**.

---

## ☁️ Deployment

| Part | Host | Notes |
|---|---|---|
| Frontend | **Netlify** | Auto-deploys from `main` branch. `client/public/_redirects` handles SPA routing. |
| Backend | **Render** | Environment variables set in Render dashboard. Auto-deploys on push. |
| Database | **MongoDB Atlas** | Production cluster. Credentials stored in Render env vars only — never committed to code. |

> ⚠️ **Security**: Never commit `.env` files or database credentials to GitHub. Always use environment variables on your hosting platform.

---

## 🔒 Security Notes

- All MongoDB credentials are stored exclusively as environment variables on Render — never in code.
- Firebase configuration values are public-safe (they are client-side keys, protected by Firebase Security Rules).
- Document edit access is validated **on the server** for every `document-change` event — the client role is for UI only.
