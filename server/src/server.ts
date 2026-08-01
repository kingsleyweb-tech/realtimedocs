import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import connectDatabase from "./config/database";
import { registerSocketHandlers } from "./handlers/socketHandlers";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with relaxed CORS settings for Netlify/Render communication
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

const PORT = process.env.PORT || 3000;

// REST API Health checks & database status monitoring
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

// Setup Websocket Event Listeners
io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

// Connect to Mongoose database
connectDatabase();

// Start HTTP & Socket server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});