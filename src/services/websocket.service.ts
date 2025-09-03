import WebSocket from 'ws';
import { Server } from 'http';

export interface WebSocketMessage {
  type: 'QUEUE_UPDATE' | 'TIMED_QUEUE_UPDATE' | 'PLAYER_UPDATE';
  simulatorId?: number;
  data?: any;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocket.Server | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server?: Server) {
    const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
    
    try {
      this.wss = new WebSocket.Server({ 
        port: wsPort,
        perMessageDeflate: false,
        clientTracking: true
      });
      
      this.wss.on('connection', (ws: WebSocket, req) => {
        console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
        
        ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected' }));
        
        ws.on('close', () => {
          console.log('WebSocket connection closed');
        });

        ws.on('error', (error) => {
          console.error('WebSocket client error:', error);
        });

        ws.on('message', (message) => {
          console.log('Received message:', message.toString());
        });
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket Server error:', error);
      });

      this.wss.on('listening', () => {
        console.log(`✅ WebSocket server listening on port ${wsPort}`);
      });

      console.log(`🔌 WebSocket server initializing on port ${wsPort}`);
    } catch (error) {
      console.error('Failed to initialize WebSocket server:', error);
    }
  }

  broadcast(message: WebSocketMessage) {
    if (!this.wss) {
      console.warn('WebSocket server not initialized');
      return;
    }

    const messageString = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  // Specific broadcast methods for different events
  broadcastQueueUpdate(simulatorId: number, data?: any) {
    this.broadcast({
      type: 'QUEUE_UPDATE',
      simulatorId,
      data
    });
  }

  broadcastTimedQueueUpdate(simulatorId: number, data?: any) {
    this.broadcast({
      type: 'TIMED_QUEUE_UPDATE',
      simulatorId,
      data
    });
  }

  broadcastPlayerUpdate(data?: any) {
    this.broadcast({
      type: 'PLAYER_UPDATE',
      data
    });
  }
}