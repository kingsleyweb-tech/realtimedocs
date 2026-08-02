import { io } from "socket.io-client";

// Use VITE_SERVER_URL from the client .env, fallback to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

// Create a persistent socket connection to the Express server
const socket = io(SERVER_URL);

socket.on("connect", () => {
  console.log(" SOCKET CONNECTED SUCCESSFULLY TO:", SERVER_URL);
});

socket.on("connect_error", (err) => {
  console.error(" SOCKET CONNECTION ERROR:", err.message, "Target Server URL:", SERVER_URL);
});

export default socket;