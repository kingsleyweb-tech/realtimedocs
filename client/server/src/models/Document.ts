import mongoose from "mongoose";

const CollaboratorSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ["editor", "viewer"], default: "editor" }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    default: "Untitled document",
  },
  content: {
    type: String,
    default: "",
  },
  ownerId: {
    type: String,
  },
  ownerEmail: {
    type: String,
  },
  collaborators: {
    type: [CollaboratorSchema],
    default: [],
  },
  publicAccess: {
    type: String,
    enum: ["restricted", "viewer", "editor"],
    default: "restricted",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isStarred: {
    type: Boolean,
    default: false,
  },
  isTrashed: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Document", DocumentSchema);