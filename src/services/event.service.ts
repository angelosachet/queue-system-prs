import { EventEmitter } from 'events';

export class EventService {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
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
}

export const eventService = new EventService();