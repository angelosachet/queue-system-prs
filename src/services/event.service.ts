import { EventEmitter } from 'events';
import { WebSocketService } from './websocket.service';

export class EventService {
  private emitter: EventEmitter;
  private wsService: WebSocketService;

  constructor() {
    this.emitter = new EventEmitter();
    this.wsService = WebSocketService.getInstance();
    this.setupWebSocketBroadcasts();
  }

  emit(event: string, data?: any) {
    this.emitter.emit(event, data);
  }

  on(event: string, listener: (data: any) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (data: any) => void) {
    this.emitter.off(event, listener);
  }

  private setupWebSocketBroadcasts() {
    // Queue events
    this.on('queue.playerAdded', (data) => {
      this.wsService.broadcastQueueUpdate(data.simulatorId, data);
    });

    this.on('queue.playerRemoved', (data) => {
      this.wsService.broadcastQueueUpdate(data.simulatorId, data);
    });

    this.on('queue.playerMoved', (data) => {
      this.wsService.broadcastQueueUpdate(data.simulatorId, data);
    });

    // Timed queue events
    this.on('timedQueue.started', (data) => {
      this.wsService.broadcastTimedQueueUpdate(data.simulatorId, data);
    });

    this.on('timedQueue.playerActivated', (data) => {
      this.wsService.broadcastTimedQueueUpdate(data.simulatorId, data);
    });

    this.on('timedQueue.playerConfirmed', (data) => {
      this.wsService.broadcastTimedQueueUpdate(data.simulatorId, data);
    });

    this.on('timedQueue.playerCompleted', (data) => {
      this.wsService.broadcastTimedQueueUpdate(data.simulatorId, data);
    });

    // Player events
    this.on('player.created', (data) => {
      this.wsService.broadcastPlayerUpdate(data);
    });

    this.on('player.updated', (data) => {
      this.wsService.broadcastPlayerUpdate(data);
    });
  }
}

export const eventService = new EventService();