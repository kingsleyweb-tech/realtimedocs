import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import connectDatabase from "./config/database";
import Document from "./models/Document";
import User from "./models/User";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Relax CORS controls to prevent Netlify-Render client disconnects
    methods: ["GET", "POST"]
  },
});

const PORT = process.env.PORT || 3000;


app.get("/", (req, res) => {
  res.send("Realtime Docs Server Running");
});

app.get("/db-status", (req, res) => {
  const state = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  res.json({
    status: states[state] || "unknown",
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  });
});

const activeDocumentUsers = new Map<string, Array<{
  socketId: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
}>>();

// Helper to fetch documents owned by or shared with a specific user
// Returns enriched objects with { isShared, role, ownerEmail } flags for the dashboard
async function getUserDocuments(userId: string) {
  if (!userId) return [];
  const userDb = await User.findOne({ uid: userId });
  const userEmail = userDb ? userDb.email : "";
  const query: any = {
    $or: [{ ownerId: userId }]
  };
  if (userEmail) {
    query.$or.push({ "collaborators.email": userEmail });
  }
  const docs = await Document.find(query).sort({ lastUpdated: -1 });

  // Enrich each document with sharing metadata so the dashboard can render badges
  return docs.map(doc => {
    const isOwner = doc.ownerId === userId || (userEmail && doc.ownerEmail === userEmail);
    const collaborator = doc.collaborators.find((c: any) => c.email === userEmail);
    const role = isOwner ? "editor" : (collaborator ? collaborator.role : "viewer");
    return {
      documentId: doc.documentId,
      title: doc.title,
      lastUpdated: doc.lastUpdated,
      isShared: !isOwner,
      role,
      ownerEmail: doc.ownerEmail || "",
      isStarred: doc.isStarred || false,
      isTrashed: doc.isTrashed || false
    };
  });
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1. Save user info to database
  socket.on("save-user", async (userData) => {
    if (!userData || !userData.uid) return;
    try {
      let user = await User.findOne({ uid: userData.uid });
      if (!user) {
        user = await User.create({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
        });
        console.log("SUCCESS: Saved new user to MongoDB:", user.displayName || user.email);
      } else {
        console.log("INFO: User already exists in MongoDB:", user.displayName || user.email);
      }
    } catch (error) {
      console.error("ERROR: Failed to save user to MongoDB", error);
    }
  });

  // 2. Join document & load data & emit user's document history
  socket.on("join-document", async ({ documentId, userId, email, displayName, photoURL }) => {
    try {
      let document = await Document.findOne({ documentId });
      
      // Inline user creation as fallback to avoid race conditions
      let userDb: any = null;
      if (userId) {
        userDb = await User.findOne({ uid: userId });
        if (!userDb && email) {
          userDb = await User.create({
            uid: userId,
            email,
            displayName,
            photoURL
          });
          console.log("SUCCESS: Inline saved user to MongoDB:", userDb.displayName || userDb.email);
        }
      }
      
      const userEmail = userDb ? userDb.email : (email || "");

      if (!document) {
        document = await Document.create({
          documentId,
          content: "",
          title: "Untitled document",
          ownerId: userId,
          ownerEmail: userEmail,
          publicAccess: "restricted",
          collaborators: []
        });
      } else if (userId && userDb) {
        // Handle owner assignment if missing
        if (!document.ownerId) {
          document.ownerId = userId;
          document.ownerEmail = userEmail;
          await document.save();
        }
      }

      // ── Access Control Assessment ──
      const isOwner = document.ownerId === userId || (userEmail && document.ownerEmail === userEmail);
      const collaborator = document.collaborators.find(c => c.email === userEmail);
      const isPublicAccessAllowed = document.publicAccess && document.publicAccess !== "restricted";

      if (!isOwner && !collaborator && !isPublicAccessAllowed) {
        socket.emit("access-denied", "You do not have permission to access this document.");
        return;
      }

      // Determine user role
      let role: "editor" | "viewer" = "viewer";
      if (isOwner) {
        role = "editor";
      } else if (collaborator) {
        role = collaborator.role;
      } else if (isPublicAccessAllowed) {
        role = document.publicAccess as "editor" | "viewer";
      }

      // Proceed to join room
      socket.join(documentId);

      // Track presence in room
      socket.data.documentId = documentId;
      socket.data.userId = userId;

      let userDetails = {
        socketId: socket.id,
        userId: userId || "anonymous",
        displayName: "Anonymous User",
        email: userEmail || "",
        photoURL: ""
      };

      if (userDb) {
        userDetails.displayName = userDb.displayName || userDb.email || "Anonymous User";
        userDetails.photoURL = userDb.photoURL || "";
      }

      if (!activeDocumentUsers.has(documentId)) {
        activeDocumentUsers.set(documentId, []);
      }
      const roomUsers = activeDocumentUsers.get(documentId)!;
      const filteredUsers = roomUsers.filter(u => u.socketId !== socket.id);
      filteredUsers.push(userDetails);
      activeDocumentUsers.set(documentId, filteredUsers);

      io.to(documentId).emit("presence-update", filteredUsers);

      // Emit document details and the assigned role
      socket.emit("load-document", {
        content: document.content,
        title: document.title,
        role: role,
        ownerEmail: document.ownerEmail || ""
      });

      // Emit updated doc history to client
      if (userId) {
        const userDocs = await getUserDocuments(userId);
        socket.emit("user-documents", userDocs);
      }
    } catch (err) {
      console.error("ERROR: Failed to join/create document", err);
    }
  });

  // 3. Handle document content edits with role validation
  socket.on("document-change", async ({ id, data }) => {
    try {
      const document = await Document.findOne({ documentId: id });
      if (!document) return;

      const userId = socket.data.userId;
      const userDb = userId ? await User.findOne({ uid: userId }) : null;
      const userEmail = userDb ? userDb.email : "";

      // Validate edit authorization
      const isOwner = document.ownerId === userId || (userEmail && document.ownerEmail === userEmail);
      const collaborator = document.collaborators.find(c => c.email === userEmail);
      const isEditor = isOwner || (collaborator && collaborator.role === "editor") || (document.publicAccess === "editor");

      if (!isEditor) {
        console.warn(`WARNING: Unauthorized edit blocked on doc ${id} by user ${userId}`);
        return;
      }

      document.content = data;
      document.lastUpdated = new Date();
      await document.save();

      socket.to(id).emit("document-update", data);
    } catch (err) {
      console.error("ERROR: Failed to save document change", err);
    }
  });

  // 4. Handle document title changes with role validation
  socket.on("rename-document", async ({ id, title, userId }) => {
    try {
      const document = await Document.findOne({ documentId: id });
      if (!document) return;

      const userDb = userId ? await User.findOne({ uid: userId }) : null;
      const userEmail = userDb ? userDb.email : "";

      // Validate edit authorization
      const isOwner = document.ownerId === userId || (userEmail && document.ownerEmail === userEmail);
      const collaborator = document.collaborators.find(c => c.email === userEmail);
      const isEditor = isOwner || (collaborator && collaborator.role === "editor") || (document.publicAccess === "editor");

      if (!isEditor) return;

      document.title = title;
      document.lastUpdated = new Date();
      await document.save();

      socket.to(id).emit("document-renamed", title);
      
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to rename document", err);
    }
  });

  // 5. Retrieve all saved documents for a specific user (both owned and shared)
  socket.on("get-user-documents", async (userId) => {
    if (!userId) return;
    try {
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to fetch user documents", err);
    }
  });

  // Star / Unstar document
  socket.on("toggle-star-document", async ({ documentId, userId }) => {
    try {
      const document = await Document.findOne({ documentId });
      if (document) {
        document.isStarred = !document.isStarred;
        await document.save();
      }
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to toggle star status", err);
    }
  });

  // Move document to trash
  socket.on("trash-document", async ({ documentId, userId }) => {
    try {
      const document = await Document.findOne({ documentId });
      if (document) {
        document.isTrashed = true;
        await document.save();
      }
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to trash document", err);
    }
  });

  // Restore document from trash
  socket.on("restore-document", async ({ documentId, userId }) => {
    try {
      const document = await Document.findOne({ documentId });
      if (document) {
        document.isTrashed = false;
        await document.save();
      }
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to restore document", err);
    }
  });

  // Permanently delete document
  socket.on("delete-document-permanent", async ({ documentId, userId }) => {
    try {
      await Document.deleteOne({ documentId });
      const userDocs = await getUserDocuments(userId);
      socket.emit("user-documents", userDocs);
    } catch (err) {
      console.error("ERROR: Failed to permanently delete document", err);
    }
  });


  // ── 7. Document Sharing settings events ──
  socket.on("get-sharing-settings", async ({ documentId, userId }) => {
    try {
      const document = await Document.findOne({ documentId });
      if (!document) return;

      const userDb = userId ? await User.findOne({ uid: userId }) : null;
      const userEmail = userDb ? userDb.email : "";

      const isOwner = document.ownerId === userId || (userEmail && document.ownerEmail === userEmail);
      const isCollaborator = document.collaborators.some(c => c.email === userEmail);

      if (!isOwner && !isCollaborator) {
        socket.emit("sharing-settings", { error: "Access denied." });
        return;
      }

      socket.emit("sharing-settings", {
        collaborators: document.collaborators,
        publicAccess: document.publicAccess || "restricted",
        ownerEmail: document.ownerEmail || "Unknown Owner"
      });
    } catch (err) {
      console.error("ERROR: Failed to get sharing settings", err);
    }
  });

  socket.on("update-sharing-settings", async ({ documentId, userId, collaborators, publicAccess }) => {
    try {
      const document = await Document.findOne({ documentId });
      if (!document) return;

      const userDb = userId ? await User.findOne({ uid: userId }) : null;
      const userEmail = userDb ? userDb.email : "";

      const isOwner = document.ownerId === userId || (userEmail && document.ownerEmail === userEmail);
      if (!isOwner) {
        socket.emit("sharing-settings-error", "Only the document owner can change sharing settings.");
        return;
      }

      document.collaborators = collaborators;
      document.publicAccess = publicAccess;
      await document.save();

      // Send confirmed settings back to the owner
      socket.emit("sharing-settings", {
        collaborators: document.collaborators,
        publicAccess: document.publicAccess,
        ownerEmail: document.ownerEmail
      });

      // Broadcast changes to anyone currently in the document room
      io.to(documentId).emit("sharing-updated", {
        collaborators,
        publicAccess
      });
    } catch (err) {
      console.error("ERROR: Failed to update sharing settings", err);
    }
  });
  // 6. Real-time cursor tracking
  socket.on("cursor-move", ({ documentId, userId, userName, selectionStart }) => {
    if (documentId && userId) {
      socket.to(documentId).emit("cursor-update", {
        userId,
        userName,
        selectionStart
      });
    }
  });

  socket.on("leave-document", ({ documentId }) => {
    const userId = socket.data.userId;
    if (documentId) {
      socket.leave(documentId);
      
      // Clean up cursor for other users
      if (userId) {
        io.to(documentId).emit("cursor-update", {
          userId,
          selectionStart: null
        });
      }

      if (activeDocumentUsers.has(documentId)) {
        const roomUsers = activeDocumentUsers.get(documentId)!;
        const updatedUsers = roomUsers.filter(u => u.socketId !== socket.id);
        if (updatedUsers.length === 0) {
          activeDocumentUsers.delete(documentId);
        } else {
          activeDocumentUsers.set(documentId, updatedUsers);
          io.to(documentId).emit("presence-update", updatedUsers);
        }
      }
    }
    socket.data.documentId = undefined;
    socket.data.userId = undefined;
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const documentId = socket.data.documentId;
    const userId = socket.data.userId;
    if (documentId) {
      // Clean up cursor for other users
      if (userId) {
        io.to(documentId).emit("cursor-update", {
          userId,
          selectionStart: null
        });
      }

      if (activeDocumentUsers.has(documentId)) {
        const roomUsers = activeDocumentUsers.get(documentId)!;
        const updatedUsers = roomUsers.filter(u => u.socketId !== socket.id);
        if (updatedUsers.length === 0) {
          activeDocumentUsers.delete(documentId);
        } else {
          activeDocumentUsers.set(documentId, updatedUsers);
          io.to(documentId).emit("presence-update", updatedUsers);
        }
      }
    }
  });
});

connectDatabase();

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});