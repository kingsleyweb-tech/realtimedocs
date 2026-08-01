# RealtimeDocs 📝
### Collaborative Real-time Document Editing Platform

Welcome to **RealtimeDocs**, a modern Google Docs clone designed for lightning-fast, collaborative, distraction-free document writing and editing. This document acts as your comprehensive guide to understanding how the entire application works, from database structures to the websockets that sync user cursor positions.

---

## 🏗️ Project Architecture Overview

RealtimeDocs is split into two primary environments:
1. **Frontend (`client/`)**: A Single Page React Application built with TypeScript, Vite, and CSS. It communicates with Firebase for authentication and connects to our websocket server to keep document contents in sync.
2. **Backend (`client/server/`)**: A Node.js & Express server running TypeScript (`ts-node-dev`). It connects to MongoDB using Mongoose and runs Socket.io to manage room-based live editing, presence tracking, and cursor sync.

```
                    ┌────────────────────────┐
                    │  Firebase Auth Service │
                    └───────────▲────────────┘
                                │ (Google Sign-In)
                                ▼
┌──────────────────┐      Websockets      ┌──────────────────┐
│  React Client    ├─────────────────────►│  Node.js Server  │
│  (Vite + TSX)    │  (Socket.io-client)  │  (Socket.io)     │
└──────────────────┘                      └────────▲─────────┘
                                                   │ (Mongoose)
                                                   ▼
                                          ┌──────────────────┐
                                          │  MongoDB Database│
                                          └──────────────────┘
```

---

## 📦 Installed Packages & Why They Are Needed

### 1. Frontend Packages (`client/package.json`)
*   **`react` & `react-dom`**: The foundation libraries for building dynamic, interactive user interfaces in components.
*   **`react-router-dom`**: Enables single-page routing (navigating between `/dashboard`, `/starred`, `/trash`, and `/document/:id` without refreshing the tab).
*   **`firebase`**: Connects directly to Google Firebase to run secure user authentication using Google Sign-in.
*   **`socket.io-client`**: The client-side library that establishes persistent, real-time connection lines with our backend socket server.
*   **`vite`**: A next-generation, fast build tool that bundles scripts and runs the development server with Hot Module Replacement (HMR).

### 2. Backend Packages (`client/server/package.json`)
*   **`express`**: A lightweight web framework used to expose simple health endpoints (e.g., standard HTTP `/`).
*   **`mongoose`**: An Object Data Modeling (ODM) library for MongoDB. It allows us to define rigid schemas (structure) for documents and users and write queries cleanly.
*   **`socket.io`**: The backend server library that coordinates real-time events, grouping connections into isolated "rooms" so users only share edits with others on the same document.
*   **`ts-node-dev`**: A development tool that compiles TypeScript on-the-fly and restarts the server automatically whenever you edit backend code files.

---

## 📁 File Structure & Directory Guide

Here is a breakdown of what every folder and key file in your project does:

### 1. Frontend Directory (`client/src/`)
*   📂 **`components/`**: House reusable layout items.
    *   📄 `DocSidebar.tsx`: The Google Docs-like navigation sidebar containing links to Dashboard, Starred, Shared with me, Trash, and displays the list of recent active documents.
    *   📄 `ToastContainer.tsx`: Listens for custom app events to display toast notification alerts (like "Document saved successfully!").
*   📂 **`pages/`**: Holds the independent views accessible via routes.
    *   📄 `Home.tsx`: The splash landing page explaining application features to guest visitors.
    *   📄 `Login.tsx`: Login gateway offering secure "Continue with Google" buttons.
    *   📄 `Register.tsx`: User registration gateway.
    *   📄 `Dashboard.tsx`: Central dashboard showing search bars, quick document creation grids, and the user's active documents.
    *   📄 `Starred.tsx`: Shows user documents flagged as `isStarred` (and not trashed).
    *   📄 `SharedWithMe.tsx`: Lists documents where the current user's email has been added to the collaborators list by another owner.
    *   📄 `Trash.tsx`: Displays deleted items with options to restore or permanently erase them. Shows a custom delete confirm modal overlay.
    *   📄 `Document.tsx`: The main editing canvas. Includes toolbars for share settings, full-screen focus toggle, word/character counter, and collaborative cursor rendering.
*   📂 **`firebase/`**:
    *   📄 `firebase.ts`: Initializes the Firebase client app instance using config credentials, exports the authentication handler, and configures the Google Auth provider.
*   📂 **`socket/`**:
    *   📄 `socket.ts`: Initializes and exports a single, shared websocket connection instance using `socket.io-client`.
*   📂 **`utils/`**:
    *   📄 `caretCoordinates.ts`: Calculates the exact `x` and `y` pixel coordinates of a cursor inside a plain HTML textarea so we can position a floating user label on top of it.
    *   📄 `toast.ts`: Reusable utility functions to trigger custom events for the toast system.
*   📄 `App.tsx`: Sets up the client routing switchboard (React Router) mapping URLs to pages.
*   📄 `index.css`: The central CSS stylesheet styling the entire interface, colors, layouts, sidebar transition states, custom modal screens, and fullscreen views.

### 2. Backend Directory (`client/server/src/`)
*   📂 **`config/`**:
    *   📄 `database.ts`: Sets up Mongoose and establishes a connection to the MongoDB database (named `realtimeDocs`).
*   📂 **`models/`**:
    *   📄 `User.ts`: MongoDB schema structure representing a registered user profile.
    *   📄 `Document.ts`: MongoDB schema mapping everything about a document — title, text content, creator, starred/trash states, and list of collaborator emails.
*   📄 `server.ts`: The core entry point. Boots up HTTP/Socket servers, connects to MongoDB, tracks active users in document rooms, validates user edit permissions, and coordinates all real-time messaging.

---

## ⚡ How Websockets Work (Live Collaboration)

Websockets are different from standard HTTP requests. Instead of the browser asking *"Do you have new changes?"* every few seconds, a websocket keeps a **constant two-way pipe** open. Both client and server can push messages instantly.

```
┌───────────┐                      ┌───────────┐
│ User A    │                      │ User B    │
└─────┬─────┘                      └─────▲─────┘
      │                                  │
      │ 1. Emits "document-change"       │ 3. Broadcasts "document-update"
      │    (Sends updated text data)     │    (Sends text to User B)
      ▼                                  │
┌────────────────────────────────────────┴─────┐
│               Socket.io Server               │
└──────────────────────────────────────────────┘
```

Here is a step-by-step trace of how collaboration functions in RealtimeDocs:

### 1. Joining a Document Room (`join-document`)
When you open a document at `/document/some-uuid`, the client sends a `join-document` event containing the `documentId` and current `userId`.
*   **The Server**:
    1. Finds or creates the document in MongoDB.
    2. Validates if the user has access (checks if they are the owner, a listed collaborator, or if the document is publicly accessible).
    3. Adds the user's socket connection into a Socket.io **room** named after the `documentId`. This isolates communications so edits on Document A don't spill into Document B.
    4. Tracks their presence details (email, photo, socket ID) and broadcasts an updated list of users present in the document (`presence-update`) to everyone else in the room.
    5. Returns the document content and title back to the client (`load-document`).

### 2. Typing Content (`document-change` & `document-update`)
*   **The Editor**: As you type inside the textarea, the client emits `document-change` containing the new text.
*   **The Server**:
    1. Verifies that the editor actually has write permissions (owner or collaborator with `editor` role).
    2. Saves the new text to MongoDB.
    3. Sends a `document-update` broadcast event to *everyone else* in that specific document room.
*   **The Collaborator**: The collaborator's client receives `document-update` and updates the text area content value instantly without reloading.

### 3. Syncing Cursors (`cursor-move` & `cursor-update`)
How does User B see User A's blinking cursor and floating email badge?
1. **The Event**: Whenever User A clicks, types, or moves their selector inside the textarea, the client calculates the character index position (e.g. index `45`).
2. **Emitting**: The client emits `cursor-move` event sending `{ documentId, userId, userName, selectionStart: 45 }`.
3. **Broadcasting**: The server immediately forwards a `cursor-update` event to all other clients in that room.
4. **Drawing Cursors (Frontend Magic)**:
   * Each collaborator receives the cursor position.
   * Using the [caretCoordinates.ts](file:///client/src/utils/caretCoordinates.ts) utility, the client creates a hidden off-screen "mirror" `div` mirroring the exact font sizes, line heights, and padding of the textarea.
   * It inputs the text up to index `45`, inserts a test `span`, and reads that span's exact coordinates.
   * The client then places a absolute-positioned floating marker with a unique color directly on top of the textarea at those coordinates.

---

## 🗄️ Database & Mongoose (MongoDB)

**MongoDB** is a NoSQL document database. Instead of rows and columns, it stores data in JSON-like structures. **Mongoose** is the translator tool that connects our Node server to MongoDB.

Our database tracks two entities:
1.  **User Model**: Stores Google auth credentials (`uid`, `email`, `displayName`, `photoURL`) when a user signs in for the first time.
2.  **Document Model**:
    *   `documentId`: Unique string ID.
    *   `title` / `content`: Self-explanatory document content.
    *   `ownerId` / `ownerEmail`: Identifies who created the document.
    *   `collaborators`: An array of objects tracking added users: `[{ email: "friend@gmail.com", role: "editor" }]`.
    *   `publicAccess`: Defines general document settings (`"restricted"`, `"viewer"`, or `"editor"`).
    *   `isStarred` / `isTrashed`: Stars are pinned to the Starred page; trashed items are hidden from dashboards and placed in the Trash page.

---

## 🔑 Authentication Flow

Authentication uses **Google Sign-In via Firebase** paired with backend synchronization:

1.  **Sign In**: When clicking "Continue with Google", Firebase opens a secure Google popup.
2.  **Explicit Account Choice**: To prevent the browser from automatically logging in a previously saved account, we configured `googleProvider.setCustomParameters({ prompt: "select_account" })`. This forces the Google account picker to show up every single time.
3.  **Persistence**: The auth state is set to `browserSessionPersistence`. This means that if a user closes their browser tabs, their login session expires immediately for safety.
4.  **Sync to DB**: Once logged in, the client sends a `save-user` socket signal to the server. If this user is logging in for the first time, a matching user record is created in MongoDB. This database record is vital because it lets other users search and share documents using your email address.

---

## 💡 Typescript File Types: `.ts` vs `.tsx`

You will notice some files end in `.ts` and others in `.tsx`. Here is why:

### 1. The Core Difference
*   **`.ts` (TypeScript)**: Standard TypeScript file. Contains variables, interfaces, functions, helper classes, and backend logic. It contains **no JSX** (HTML-in-JavaScript code).
*   **`.tsx` (TypeScript XML)**: A TypeScript file that contains **JSX code**. This is used when you are building React UI components that return structural markup (like `<div>` or `<button>`).

### 2. Guidelines in RealtimeDocs
*   **`client/src/pages/` & `client/src/components/`**: These folders build the UI elements, sidebars, buttons, and views. They return HTML tags, so they **MUST use `.tsx`**.
*   **`client/src/utils/`**: These files contain pure logic algorithms (like calculating cursor positions or triggers). They only contain code calculations, so they **use `.ts`**.
*   **`client/src/firebase/` & `client/src/socket/`**: These files configure background services. They don't render UI, so they **use `.ts`**.
*   **Backend (`client/server/src/`)**: The backend server is entirely data logic, database connections, and socket routing. It has no visual frontend component, which is why the entire server directory is **strictly `.ts`**.

---

## 🚀 How to Run the Project Locally

Follow these quick commands to spin up the environment:

### Prerequisite
Ensure you have **Node.js** installed and **MongoDB** running locally on your machine at `mongodb://localhost:27017`.

### Step 1: Start the Backend Server
Navigate to the server directory, install packages, and boot:
```bash
cd client/server
npm install
npm run dev
```
*(The socket server will boot up and run on Port `3000`)*

### Step 2: Start the React Frontend App
Open a separate terminal window, navigate to the client directory, install packages, and boot:
```bash
cd client
npm install
npm run dev
```
*(The React application will compile and open at `http://localhost:5173`)*
