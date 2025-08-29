// src/server.ts
import { app } from './app';
import { eventService } from './services/event.service';

const PORT = process.env.PORT || 3000;

// Setup event listeners
eventService.on('queue.playerAdded', (data) => {
  console.log(`Player ${data.playerId} added to queue ${data.queueId} at position ${data.position}`);
});

eventService.on('queue.playerRemoved', (data) => {
  console.log(`Player ${data.playerId} removed from queue ${data.queueId} at position ${data.position}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
