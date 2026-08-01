// Import the Socket.IO client to connect to the backend WebSocket server
import { io } from "socket.io-client";

// Create a persistent socket connection to the Express server on port 3000
const socket = io("http://localhost:3000");

export default socket;