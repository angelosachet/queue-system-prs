import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ACSessionService } from './acSession.service';

export interface ACLauncherConnection {
  pcIp: string;
  ws: WebSocket;
  isConnected: boolean;
  lastPing?: Date;
  reconnectAttempts: number;
}

export interface ACCommand {
  command: string;
  data?: any;
}

export interface ACResponse {
  command: string;
  data: any;
  raw: string;
}

export class ACWebSocketClientService extends EventEmitter {
  private connections: Map<string, ACLauncherConnection> = new Map();
  private acSessionService = new ACSessionService();
  private reconnectInterval = 5000; // 5 seconds
  private maxReconnectAttempts = 5;
  private pingInterval = 30000; // 30 seconds
  private pingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.startHealthCheck();
    
    // Handle unhandled errors to prevent crashes
    this.on('error', (errorData) => {
      // Error is already logged in the WebSocket error handler
      // This prevents the unhandled error from crashing the application
    });
  }

  /**
   * Connect to an AC Launcher instance
   */
  async connect(pcIp: string, port: number = 8090): Promise<boolean> {
    try {
      if (this.connections.has(pcIp)) {
        const existing = this.connections.get(pcIp)!;
        if (existing.isConnected) {
          console.log(`Already connected to AC Launcher at ${pcIp}`);
          return true;
        }
        // Clean up existing connection
        this.disconnect(pcIp);
      }

      const wsUrl = `ws://${pcIp}:${port}`;
      console.log(`Connecting to AC Launcher at ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      const connection: ACLauncherConnection = {
        pcIp,
        ws,
        isConnected: false,
        reconnectAttempts: 0
      };

      this.connections.set(pcIp, connection);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        ws.on('open', () => {
          clearTimeout(timeout);
          connection.isConnected = true;
          connection.reconnectAttempts = 0;
          console.log(`✅ Successfully connected to AC Launcher at ${pcIp}`);
          
          // Start ping interval
          this.startPingInterval(pcIp);
          
          // Send initial commands
          this.sendInitialCommands(pcIp);
          
          this.emit('connected', { pcIp });
          resolve(true);
        });

        ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(pcIp, data.toString());
        });

        ws.on('close', (code: number, reason: string) => {
          console.log(`AC Launcher connection closed: ${pcIp}, code: ${code}, reason: ${reason}`);
          connection.isConnected = false;
          this.stopPingInterval(pcIp);
          this.emit('disconnected', { pcIp, code, reason });
          
          // Attempt reconnection
          this.scheduleReconnect(pcIp);
        });

        ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          connection.isConnected = false;
          this.stopPingInterval(pcIp);
          
          // Enhanced error logging
          if (error.message.includes('ECONNREFUSED')) {
            console.error(`❌ AC Launcher connection refused for ${pcIp}:8090 - AC Launcher may not be running`);
            console.log(`🔄 Will attempt to reconnect automatically...`);
          } else if (error.message.includes('ENOTFOUND')) {
            console.error(`❌ AC Launcher host not found: ${pcIp} - Check IP address`);
          } else if (error.message.includes('ETIMEDOUT')) {
            console.error(`❌ AC Launcher connection timeout for ${pcIp} - Check network connectivity`);
          } else {
            console.error(`❌ AC Launcher WebSocket error for ${pcIp}:`, error.message);
          }
          
          this.emit('error', { pcIp, error });
          
          // Schedule reconnection for connection errors
          if (error.message.includes('ECONNREFUSED') || 
              error.message.includes('ENOTFOUND') || 
              error.message.includes('ETIMEDOUT') || 
              error.message.includes('connect')) {
            this.scheduleReconnect(pcIp);
          }
          
          reject(error);
        });
      });
    } catch (error) {
      console.error(`Failed to connect to AC Launcher at ${pcIp}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from an AC Launcher instance
   */
  disconnect(pcIp: string): void {
    const connection = this.connections.get(pcIp);
    if (connection) {
      this.stopPingInterval(pcIp);
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      this.connections.delete(pcIp);
      console.log(`Disconnected from AC Launcher at ${pcIp}`);
    }
  }

  /**
   * Send a command to an AC Launcher instance
   */
  async sendCommand(pcIp: string, command: ACCommand): Promise<boolean> {
    const connection = this.connections.get(pcIp);
    if (!connection || !connection.isConnected) {
      console.error(`No active connection to AC Launcher at ${pcIp}`);
      return false;
    }

    try {
      let message: string;
      if (command.data) {
        // Send as JSON if data is provided
        message = JSON.stringify(command);
      } else {
        // Send as simple command string
        message = command.command;
      }

      connection.ws.send(message);
      console.log(`Sent command to ${pcIp}:`, message);
      return true;
    } catch (error) {
      console.error(`Failed to send command to ${pcIp}:`, error);
      return false;
    }
  }

  /**
   * Send initial commands after connection
   */
  private async sendInitialCommands(pcIp: string): Promise<void> {
    // Send ping to verify connection
    await this.sendCommand(pcIp, { command: 'ping' });
  }

  /**
   * Configure and start AC session using proper AC Launcher commands
   */
  async configureAndStartSession(pcIp: string, config: {
    sessionId: number;
    playerName?: string;
    carModel?: string;
    trackName?: string;
    sessionType?: string;
    timeLimit?: number;
  }): Promise<boolean> {
    const connection = this.connections.get(pcIp);
    if (!connection || !connection.isConnected) {
      console.error(`No active connection to AC Launcher at ${pcIp}`);
      return false;
    }

    try {
      // Set player name
      if (config.playerName) {
        await this.sendCommand(pcIp, { command: `setplayer,${config.playerName}` });
        await this.delay(100);
      }

      // Set car model
      if (config.carModel && config.carModel !== 'default') {
        await this.sendCommand(pcIp, { command: `setcar,${config.carModel}` });
        await this.delay(100);
      }

      // Set track
      if (config.trackName && config.trackName !== 'default') {
        await this.sendCommand(pcIp, { command: `settrack,${config.trackName}` });
        await this.delay(100);
      }

      // Set session mode
      if (config.sessionType) {
        await this.sendCommand(pcIp, { command: `setmode,${config.sessionType}` });
        await this.delay(100);
      }

      // Set difficulty to gamer (default)
      await this.sendCommand(pcIp, { command: 'gamer,' });
      await this.delay(100);

      // Start the session
      await this.sendCommand(pcIp, { command: 'start,' });

      console.log(`Configured and started AC session ${config.sessionId} on ${pcIp}:`, {
        carModel: config.carModel || 'default',
        trackName: config.trackName || 'default',
        sessionType: config.sessionType || 'practice',
        timeLimit: config.timeLimit || 10
      });

      return true;
    } catch (error) {
      console.error(`Failed to configure AC session on ${pcIp}:`, error);
      return false;
    }
  }

  /**
   * Helper method to add delays between commands
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle incoming messages from AC Launcher
   */
  private handleMessage(pcIp: string, message: string): void {
    console.log(`Received from ${pcIp}:`, message);
    
    try {
      let response: ACResponse;
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(message);
        response = {
          command: parsed.command || 'unknown',
          data: parsed.data || parsed,
          raw: message
        };
      } catch {
        // Parse as comma-separated values
        const parts = message.split(',');
        response = {
          command: parts[0] || 'unknown',
          data: parts.slice(1),
          raw: message
        };
      }

      // Update connection last ping time for pong responses
      if (response.command === 'pong') {
        const connection = this.connections.get(pcIp);
        if (connection) {
          connection.lastPing = new Date();
        }
      }

      // Emit the response for other services to handle
      this.emit('message', { pcIp, response });
      this.emit(`message:${response.command}`, { pcIp, response });
      
    } catch (error) {
      console.error(`Error parsing message from ${pcIp}:`, error);
      this.emit('parseError', { pcIp, message, error });
    }
  }

  /**
   * Start ping interval for a connection
   */
  private startPingInterval(pcIp: string): void {
    const timer = setInterval(() => {
      this.sendCommand(pcIp, { command: 'ping' });
    }, this.pingInterval);
    
    this.pingTimers.set(pcIp, timer);
  }

  /**
   * Stop ping interval for a connection
   */
  private stopPingInterval(pcIp: string): void {
    const timer = this.pingTimers.get(pcIp);
    if (timer) {
      clearInterval(timer);
      this.pingTimers.delete(pcIp);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(pcIp: string): void {
    const connection = this.connections.get(pcIp);
    
    // If connection doesn't exist, create a basic one for tracking reconnection attempts
    if (!connection) {
      const newConnection: ACLauncherConnection = {
        pcIp,
        ws: null as any, // Will be set during reconnection
        isConnected: false,
        reconnectAttempts: 0
      };
      this.connections.set(pcIp, newConnection);
    }
    
    const currentConnection = this.connections.get(pcIp)!;
    
    if (currentConnection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${pcIp}`);
      this.emit('maxReconnectAttemptsReached', { pcIp });
      return;
    }

    currentConnection.reconnectAttempts++;
    const delay = this.reconnectInterval * currentConnection.reconnectAttempts;
    
    console.log(`Scheduling reconnection to ${pcIp} in ${delay}ms (attempt ${currentConnection.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      const conn = this.connections.get(pcIp);
      if (conn && !conn.isConnected) {
        try {
          console.log(`Attempting reconnection to ${pcIp}...`);
          await this.connect(pcIp);
        } catch (error) {
          console.error(`Reconnection attempt failed for ${pcIp}:`, error);
          // The error handler will schedule another reconnection if needed
        }
      }
    }, delay);
  }

  /**
   * Start health check for all connections
   */
  private startHealthCheck(): void {
    setInterval(() => {
      for (const [pcIp, connection] of this.connections) {
        if (connection.isConnected && connection.lastPing) {
          const timeSinceLastPing = Date.now() - connection.lastPing.getTime();
          if (timeSinceLastPing > this.pingInterval * 2) {
            console.warn(`No pong received from ${pcIp} for ${timeSinceLastPing}ms, considering disconnected`);
            connection.isConnected = false;
            this.scheduleReconnect(pcIp);
          }
        }
      }
    }, this.pingInterval);
  }

  /**
   * Get connection status for a PC IP
   */
  getConnectionStatus(pcIp: string): { isConnected: boolean; lastPing?: Date; reconnectAttempts: number } | null {
    const connection = this.connections.get(pcIp);
    if (!connection) return null;
    
    return {
      isConnected: connection.isConnected,
      lastPing: connection.lastPing,
      reconnectAttempts: connection.reconnectAttempts
    };
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.entries())
      .filter(([, connection]) => connection.isConnected)
      .map(([pcIp]) => pcIp);
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    for (const pcIp of this.connections.keys()) {
      this.disconnect(pcIp);
    }
  }

  /**
   * Reset reconnection attempts for a specific PC
   */
  resetReconnectionAttempts(pcIp: string): void {
    const connection = this.connections.get(pcIp);
    if (connection) {
      connection.reconnectAttempts = 0;
      console.log(`Reset reconnection attempts for ${pcIp}`);
    }
  }

  /**
   * Get reconnection status for a PC
   */
  getReconnectionStatus(pcIp: string): { attempts: number; maxAttempts: number; nextRetryIn?: number } | null {
    const connection = this.connections.get(pcIp);
    if (!connection) return null;
    
    return {
      attempts: connection.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * Manually trigger reconnection (resets attempt counter)
   */
  async forceReconnect(pcIp: string): Promise<boolean> {
    console.log(`🔄 Force reconnecting to ${pcIp}...`);
    this.resetReconnectionAttempts(pcIp);
    this.disconnect(pcIp);
    return await this.connect(pcIp);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { total: number; connected: number; reconnecting: number } {
    let connected = 0;
    let reconnecting = 0;
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected) {
        connected++;
      } else if (connection.reconnectAttempts > 0 && connection.reconnectAttempts < this.maxReconnectAttempts) {
        reconnecting++;
      }
    }
    
    return {
      total: this.connections.size,
      connected,
      reconnecting
    };
  }
}

// Export singleton instance
export const acWebSocketClientService = new ACWebSocketClientService();