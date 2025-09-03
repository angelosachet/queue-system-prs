// src/server.ts
import { createServer } from 'http';
import { app } from './app';
import { eventService } from './services/event.service';
import { WebSocketService } from './services/websocket.service';

const PORT = process.env.PORT || 3000;

// Setup event listeners
eventService.on('queue.playerAdded', (data) => {
  console.log(`Player ${data.playerId} added to queue ${data.queueId} at position ${data.position}`);
});

eventService.on('queue.playerRemoved', (data) => {
  console.log(`Player ${data.playerId} removed from queue ${data.queueId} at position ${data.position}`);
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server on separate port
const wsService = WebSocketService.getInstance();
wsService.initialize();

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready on ws://localhost:8080`);
});
