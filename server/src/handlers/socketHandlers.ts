import { Server, Socket } from "socket.io";
import Document from "../models/Document";
import User from "../models/User";
import { getUserDocuments } from "../utils/documentHelper";

// Map to track active users in each document room for presence indicator
const activeDocumentUsers = new Map<string, Array<{
  socketId: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
}>>();

export function registerSocketHandlers(io: Server, socket: Socket) {
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

  // 2. Join document room & load data & emit user's document history
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

      const userDetails = {
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

  // 6. Document Sharing settings events
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

  // 7. Real-time cursor tracking
  socket.on("cursor-move", ({ documentId, userId, userName, selectionStart }) => {
    if (documentId && userId) {
      socket.to(documentId).emit("cursor-update", {
        userId,
        userName,
        selectionStart
      });
    }
  });

  // 8. Cleanups on leave & disconnect
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
}
