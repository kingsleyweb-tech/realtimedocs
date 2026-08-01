// Import the Socket.IO client to connect to the backend WebSocket server
import { io } from "socket.io-client";

// Use VITE_SERVER_URL from the client .env, fallback to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

// Create a persistent socket connection to the Express server
const socket = io(SERVER_URL);

export default socket;