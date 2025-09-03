# WebSocket Configuration

## Backend
- **WebSocket Server**: `ws://localhost:8080`
- **HTTP Server**: `http://localhost:3000`
- **Separate ports** to avoid conflicts

## Frontend Connection
```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080');

// Or use the provided hook
useWebSocket({
  onQueueUpdate: (simulatorId) => {
    // Reload queue data
    loadQueues();
  }
});
```

## Environment Variables
Add to `.env` file:
```
WS_PORT=8080
```

## Testing WebSocket
1. Start backend: `npm run dev`
2. Check logs for: "WebSocket server ready on ws://localhost:8080"
3. Connect from frontend to `ws://localhost:8080`
4. Should receive welcome message: `{"type":"CONNECTED","message":"WebSocket connected"}`

## Events Broadcasted
- `QUEUE_UPDATE` - When player added/removed/moved
- `TIMED_QUEUE_UPDATE` - When timed queue changes
- `PLAYER_UPDATE` - When player created/updated

## Troubleshooting
- If connection fails, check if port 8080 is available
- Check browser console for WebSocket errors
- Verify backend logs show "WebSocket server initialized"